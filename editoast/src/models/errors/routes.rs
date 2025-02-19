use std::fmt;

use diesel::sql_types::{Array, Integer, Json, Text};
use diesel::{sql_query, PgConnection, RunQueryDsl};
use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

use super::graph::Graph;
use super::InfraError;
use crate::objects::{Direction, DirectionalTrackRange, ObjectType, Route};
use crate::{infra_cache::InfraCache, objects::ObjectRef};
use diesel::result::Error as DieselError;
use serde_json::to_value;

/// Represent the entry or exit point of a path
#[derive(Serialize, Deserialize, Debug, Clone, Copy, EnumIter, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub enum PathEndpointField {
    #[serde(rename = "entry_point")]
    EntryPoint,
    #[serde(rename = "exit_point")]
    ExitPoint,
}

impl PathEndpointField {
    /// Given a path, retrieve track id and position offset of the path endpoint location
    pub fn get_path_location(&self, path: &[DirectionalTrackRange]) -> (String, f64) {
        let track_range = match self {
            PathEndpointField::EntryPoint => path.first().unwrap(),
            PathEndpointField::ExitPoint => path.last().unwrap(),
        };

        let pos = match (self, &track_range.direction) {
            (PathEndpointField::EntryPoint, Direction::StartToStop) => track_range.begin,
            (PathEndpointField::EntryPoint, Direction::StopToStart) => track_range.end,
            (PathEndpointField::ExitPoint, Direction::StartToStop) => track_range.end,
            (PathEndpointField::ExitPoint, Direction::StopToStart) => track_range.begin,
        };

        (track_range.track.obj_id.clone(), pos)
    }

    pub fn get_route_endpoint<'a>(&self, route: &'a Route) -> &'a ObjectRef {
        match self {
            PathEndpointField::EntryPoint => &route.entry_point,
            PathEndpointField::ExitPoint => &route.exit_point,
        }
    }
}

impl fmt::Display for PathEndpointField {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", serde_json::to_string(self).unwrap())
    }
}

/// Given an ObjectRef, retrieve the id and position of its track section
/// If the object type is not a detector or a buffer stop, return `None`
/// If there is an invalid reference, return `None`
fn get_object(object: &ObjectRef, infra_cache: &InfraCache) -> Option<(String, f64)> {
    let obj_id = &object.obj_id;
    match object.obj_type {
        ObjectType::Detector => infra_cache
            .detectors()
            .get(obj_id)
            .map(|d| d.unwrap_detector())
            .map(|d| (d.track.clone(), d.position)),
        ObjectType::BufferStop => infra_cache
            .buffer_stops()
            .get(obj_id)
            .map(|d| d.unwrap_buffer_stop())
            .map(|bs| (bs.track.clone(), bs.position)),
        _ => None,
    }
}

/// Check if the id and the position of the endpoint referenced track
/// matches the id and the position of the object on the tracksection
fn get_matching_endpoint_error(
    path: &[DirectionalTrackRange],
    expected_track: String,
    expected_position: f64,
    endpoint_field: PathEndpointField,
    route_id: String,
) -> Option<InfraError> {
    let (track, pos) = endpoint_field.get_path_location(path);

    if track != expected_track || pos != expected_position {
        Some(InfraError::new_path_does_not_match_endpoints(
            route_id,
            "path",
            expected_track,
            expected_position,
            endpoint_field,
        ))
    } else {
        None
    }
}

pub fn insert_errors(
    conn: &PgConnection,
    infra_id: i32,
    infra_cache: &InfraCache,
    graph: &Graph,
) -> Result<(), DieselError> {
    let infra_errors = generate_errors(infra_cache, graph);

    let mut route_ids = vec![];
    let mut errors = vec![];

    for error in infra_errors {
        route_ids.push(error.obj_id.clone());
        errors.push(to_value(error).unwrap());
    }

    let count = sql_query(include_str!("sql/routes_insert_errors.sql"))
        .bind::<Integer, _>(infra_id)
        .bind::<Array<Text>, _>(&route_ids)
        .bind::<Array<Json>, _>(&errors)
        .execute(conn)?;
    assert_eq!(count, route_ids.len());

    Ok(())
}

pub fn generate_errors(infra_cache: &InfraCache, graph: &Graph) -> Vec<InfraError> {
    let mut errors = vec![];

    for (route_id, route) in infra_cache.routes().iter() {
        let route = route.unwrap_route();
        if route.path.is_empty() {
            let infra_error = InfraError::new_empty_path(route_id.clone(), "path");
            errors.push(infra_error);
            continue;
        }

        let mut skip_continuous_path = false;

        for (index, path) in route.path.iter().enumerate() {
            // Retrieve invalid refs
            let track_id = &path.track.obj_id;
            if !infra_cache.track_sections().contains_key(track_id) {
                let obj_ref = ObjectRef::new(ObjectType::TrackSection, track_id.clone());
                let infra_error = InfraError::new_invalid_reference(
                    route_id.clone(),
                    format!("path.{}", index),
                    obj_ref,
                );
                errors.push(infra_error);
                skip_continuous_path = true;
                continue;
            }

            let track_cache = infra_cache
                .track_sections()
                .get(track_id)
                .unwrap()
                .unwrap_track_section();
            // Retrieve out of range
            for (pos, field) in [(path.begin, "begin"), (path.end, "end")] {
                if !(0.0..=track_cache.length).contains(&pos) {
                    let infra_error = InfraError::new_out_of_range(
                        route_id.clone(),
                        format!("path.{}.{}", index, field),
                        pos,
                        [0.0, track_cache.length],
                    );
                    errors.push(infra_error);
                    skip_continuous_path = true;
                }
            }
        }

        if skip_continuous_path {
            continue;
        }

        for (index, (prev, next)) in route.path.iter().zip(route.path.iter().skip(1)).enumerate() {
            // TODO : differentiate errors caused by range and topology
            let infra_error = InfraError::new_path_is_not_continuous(
                route_id.clone(),
                format!("path.{}", index + 1),
            );

            // path continuous between 2 trackrange on a same track
            if prev.track == next.track {
                if prev.direction != next.direction {
                    errors.push(infra_error);
                    continue;
                }

                if (prev.direction == Direction::StartToStop && prev.end != next.begin)
                    || (prev.direction == Direction::StopToStart && prev.begin != next.end)
                {
                    errors.push(infra_error);
                }

                continue;
            }

            // check if two paths are connected (topolgy)
            let prev_endpoint = prev.get_end();
            let next_endpoint = next.get_begin();

            if graph
                .get_neighbours(&prev_endpoint)
                .map_or(true, |set| !set.contains(&next_endpoint))
            {
                errors.push(infra_error);
                continue;
            }

            // check for the ranges
            let track_cache = infra_cache
                .track_sections()
                .get(&prev.track.obj_id)
                .unwrap()
                .unwrap_track_section();
            if (prev.direction == Direction::StartToStop && prev.end != track_cache.length)
                || (prev.direction == Direction::StopToStart && prev.begin != 0.0)
            {
                errors.push(infra_error);
                continue;
            }

            let track_cache = infra_cache
                .track_sections()
                .get(&next.track.obj_id)
                .unwrap()
                .unwrap_track_section();
            if (prev.direction == Direction::StartToStop && next.begin != 0.0)
                || (prev.direction == Direction::StopToStart && next.end != track_cache.length)
            {
                errors.push(infra_error);
            }
        }

        // Retrieve errors on entry and exit point
        for path_endpoint in PathEndpointField::iter() {
            let (expected_track, expected_position) =
                match get_object(path_endpoint.get_route_endpoint(route), infra_cache) {
                    None => {
                        let error = InfraError::new_invalid_reference(
                            route_id.clone(),
                            path_endpoint.to_string(),
                            route.entry_point.clone(),
                        );
                        errors.push(error);
                        continue;
                    }
                    Some(e) => e,
                };

            if let Some(error) = get_matching_endpoint_error(
                &route.path,
                expected_track,
                expected_position,
                path_endpoint,
                route_id.clone(),
            ) {
                errors.push(error);
            }
        }

        // TODO: Should we test the type detector ?
        for (index, release_detector) in route.release_detectors.iter().enumerate() {
            // Handle invalid ref for release detectors
            let (track, position) = match get_object(release_detector, infra_cache) {
                None => {
                    let error = InfraError::new_invalid_reference(
                        route_id.clone(),
                        format!("release_detector.{}", index),
                        release_detector.clone(),
                    );
                    errors.push(error);
                    continue;
                }
                Some(e) => e,
            };

            // Handle release detectors outside from path
            let track_range = route.path.iter().find(|track_range| {
                track_range.track.obj_id == track
                    && (track_range.begin..=track_range.end).contains(&position)
            });
            if track_range.is_none() {
                let error = InfraError::new_object_out_of_path(
                    route_id.clone(),
                    format!("release_detector.{}", index),
                    position,
                    track,
                );
                errors.push(error);
            }
        }
    }

    errors
}

#[cfg(test)]
mod tests {
    use crate::{
        infra_cache::tests::{create_detector_cache, create_route_cache, create_small_infra_cache},
        models::errors::{graph::Graph, routes::PathEndpointField},
        objects::{Direction, ObjectRef, ObjectType},
    };

    use super::generate_errors;
    use super::InfraError;

    #[test]
    fn invalid_ref() {
        let mut infra_cache = create_small_infra_cache();
        let error_path = vec![
            ("A", 20., 500., Direction::StartToStop),
            ("E", 0., 500., Direction::StartToStop),
            ("B", 0., 250., Direction::StartToStop),
        ];
        infra_cache.add(create_route_cache(
            "R_error",
            ObjectRef {
                obj_type: ObjectType::BufferStop,
                obj_id: "BF1".into(),
            },
            ObjectRef {
                obj_type: ObjectType::Detector,
                obj_id: "D1".into(),
            },
            vec![],
            error_path,
        ));
        let graph = Graph::load(&infra_cache);
        let errors = generate_errors(&infra_cache, &graph);
        assert_eq!(1, errors.len());
        let obj_ref = ObjectRef::new(ObjectType::TrackSection, "E");
        let infra_error = InfraError::new_invalid_reference("R_error", "path.1", obj_ref);
        assert_eq!(infra_error, errors[0]);
    }

    #[test]
    fn out_of_range() {
        let mut infra_cache = create_small_infra_cache();
        let error_path = vec![
            ("A", 20., 600., Direction::StartToStop),
            ("B", 0., 250., Direction::StartToStop),
        ];
        infra_cache.add(create_route_cache(
            "R_error",
            ObjectRef {
                obj_type: ObjectType::BufferStop,
                obj_id: "BF1".into(),
            },
            ObjectRef {
                obj_type: ObjectType::Detector,
                obj_id: "D1".into(),
            },
            vec![],
            error_path,
        ));
        let graph = Graph::load(&infra_cache);
        let errors = generate_errors(&infra_cache, &graph);
        assert_eq!(1, errors.len());
        let infra_error = InfraError::new_out_of_range("R_error", "path.0.end", 600., [0.0, 500.]);
        assert_eq!(infra_error, errors[0]);
    }

    #[test]
    fn invalid_ref_entry_point() {
        let mut infra_cache = create_small_infra_cache();
        let error_path = vec![
            ("A", 20., 500., Direction::StartToStop),
            ("B", 0., 250., Direction::StartToStop),
        ];
        infra_cache.add(create_route_cache(
            "R_error",
            ObjectRef::new(ObjectType::BufferStop, "BF_non_existing"),
            ObjectRef::new(ObjectType::Detector, "D1"),
            vec![],
            error_path,
        ));
        let graph = Graph::load(&infra_cache);
        let errors = generate_errors(&infra_cache, &graph);
        assert_eq!(1, errors.len());
        let obj_ref = ObjectRef::new(ObjectType::BufferStop, "BF_non_existing");
        let infra_error = InfraError::new_invalid_reference("R_error", "\"entry_point\"", obj_ref);
        assert_eq!(infra_error, errors[0]);
    }

    #[test]
    fn path_match_endpoint() {
        let mut infra_cache = create_small_infra_cache();
        let error_path = vec![
            ("A", 40., 500., Direction::StartToStop),
            ("B", 0., 250., Direction::StartToStop),
        ];
        infra_cache.add(create_route_cache(
            "R_error",
            ObjectRef {
                obj_type: ObjectType::BufferStop,
                obj_id: "BF1".into(),
            },
            ObjectRef {
                obj_type: ObjectType::Detector,
                obj_id: "D1".into(),
            },
            vec![],
            error_path,
        ));
        let graph = Graph::load(&infra_cache);
        let errors = generate_errors(&infra_cache, &graph);
        assert_eq!(1, errors.len());
        let infra_error = InfraError::new_path_does_not_match_endpoints(
            "R_error",
            "path",
            "A".into(),
            20.,
            PathEndpointField::EntryPoint,
        );
        assert_eq!(infra_error, errors[0]);
    }

    #[test]
    fn invalid_ref_release_detector() {
        let mut infra_cache = create_small_infra_cache();
        let error_path = vec![
            ("A", 20., 500., Direction::StartToStop),
            ("B", 0., 250., Direction::StartToStop),
        ];
        infra_cache.add(create_route_cache(
            "R_error",
            ObjectRef {
                obj_type: ObjectType::BufferStop,
                obj_id: "BF1".into(),
            },
            ObjectRef {
                obj_type: ObjectType::Detector,
                obj_id: "D1".into(),
            },
            vec![ObjectRef {
                obj_type: ObjectType::Detector,
                obj_id: "non_existing_D".into(),
            }],
            error_path,
        ));
        let graph = Graph::load(&infra_cache);
        let errors = generate_errors(&infra_cache, &graph);
        assert_eq!(1, errors.len());
        let infra_error = InfraError::new_invalid_reference(
            "R_error",
            "release_detector.0",
            ObjectRef {
                obj_type: ObjectType::Detector,
                obj_id: "non_existing_D".into(),
            },
        );
        assert_eq!(infra_error, errors[0]);
    }

    #[test]
    fn out_of_path() {
        let mut infra_cache = create_small_infra_cache();
        let error_path = vec![
            ("A", 20., 500., Direction::StartToStop),
            ("B", 0., 250., Direction::StartToStop),
        ];
        infra_cache.add(create_detector_cache("D2", "C", 250.));
        infra_cache.add(create_route_cache(
            "R_error",
            ObjectRef {
                obj_type: ObjectType::BufferStop,
                obj_id: "BF1".into(),
            },
            ObjectRef {
                obj_type: ObjectType::Detector,
                obj_id: "D1".into(),
            },
            vec![ObjectRef {
                obj_type: ObjectType::Detector,
                obj_id: "D2".into(),
            }],
            error_path,
        ));
        let graph = Graph::load(&infra_cache);
        let errors = generate_errors(&infra_cache, &graph);
        assert_eq!(1, errors.len());
        let infra_error =
            InfraError::new_object_out_of_path("R_error", "release_detector.0", 250., "C".into());
        assert_eq!(infra_error, errors[0]);
    }

    #[test]
    fn path_not_continuous_1() {
        let mut infra_cache = create_small_infra_cache();
        let error_path = vec![
            ("A", 20., 500., Direction::StartToStop),
            ("B", 100., 250., Direction::StartToStop),
        ];
        infra_cache.add(create_route_cache(
            "R_error",
            ObjectRef {
                obj_type: ObjectType::BufferStop,
                obj_id: "BF1".into(),
            },
            ObjectRef {
                obj_type: ObjectType::Detector,
                obj_id: "D1".into(),
            },
            vec![],
            error_path,
        ));
        let graph = Graph::load(&infra_cache);
        let errors = generate_errors(&infra_cache, &graph);
        assert_eq!(1, errors.len());
        let infra_error = InfraError::new_path_is_not_continuous("R_error", "path.1");
        assert_eq!(infra_error, errors[0]);
    }

    #[test]
    fn path_not_continuous_2() {
        let mut infra_cache = create_small_infra_cache();
        let error_path = vec![
            ("A", 20., 250., Direction::StartToStop),
            ("A", 300., 500., Direction::StartToStop),
            ("B", 0., 250., Direction::StartToStop),
        ];
        infra_cache.add(create_route_cache(
            "R_error",
            ObjectRef {
                obj_type: ObjectType::BufferStop,
                obj_id: "BF1".into(),
            },
            ObjectRef {
                obj_type: ObjectType::Detector,
                obj_id: "D1".into(),
            },
            vec![],
            error_path,
        ));
        let graph = Graph::load(&infra_cache);
        let errors = generate_errors(&infra_cache, &graph);
        assert_eq!(1, errors.len());
        let infra_error = InfraError::new_path_is_not_continuous("R_error", "path.1");
        assert_eq!(infra_error, errors[0]);
    }

    #[test]
    fn path_not_continuous_3() {
        let mut infra_cache = create_small_infra_cache();
        let error_path = vec![
            ("A", 20., 500., Direction::StartToStop),
            ("C", 0., 250., Direction::StartToStop),
        ];
        infra_cache.add(create_detector_cache("D2", "C", 250.));
        infra_cache.add(create_route_cache(
            "R_error",
            ObjectRef {
                obj_type: ObjectType::BufferStop,
                obj_id: "BF1".into(),
            },
            ObjectRef {
                obj_type: ObjectType::Detector,
                obj_id: "D2".into(),
            },
            vec![],
            error_path,
        ));
        let graph = Graph::load(&infra_cache);
        let errors = generate_errors(&infra_cache, &graph);
        assert_eq!(1, errors.len());
        let infra_error = InfraError::new_path_is_not_continuous("R_error", "path.1");
        assert_eq!(infra_error, errors[0]);
    }
}
