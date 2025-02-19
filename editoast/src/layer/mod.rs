mod bounding_box;
mod invalidate_chartos;

pub use bounding_box::{BoundingBox, InvalidationZone};
pub use invalidate_chartos::{invalidate_bbox_chartos_layer, invalidate_chartos_layer};

use crate::client::ChartosConfig;
use crate::infra_cache::InfraCache;
use crate::objects::operation::{OperationResult, RailjsonObject};
use crate::objects::{OSRDObject, ObjectType};
use diesel::prelude::*;
use diesel::result::Error;
use diesel::sql_query;
use diesel::sql_types::{Array, Integer, Text};
use std::collections::HashSet;

pub trait Layer {
    fn get_table_name() -> &'static str;
    fn generate_layer_query() -> &'static str;
    fn insert_update_layer_query() -> &'static str;
    fn layer_name() -> &'static str;
    fn get_obj_type() -> ObjectType;

    /// Clear and regenerate fully the layer of a given infra id
    fn refresh(
        conn: &PgConnection,
        infra: i32,
        chartos_config: &ChartosConfig,
    ) -> Result<(), Error> {
        // Clear layer
        sql_query(format!(
            "DELETE FROM {} WHERE infra_id = $1",
            Self::get_table_name()
        ))
        .bind::<Integer, _>(infra)
        .execute(conn)?;

        sql_query(Self::generate_layer_query())
            .bind::<Integer, _>(infra)
            .execute(conn)?;
        invalidate_chartos_layer(infra, Self::layer_name(), chartos_config);
        Ok(())
    }

    /// Insert or update some objects of the layer object
    fn insert_update_list(
        conn: &PgConnection,
        infra: i32,
        obj_ids: HashSet<&String>,
    ) -> Result<(), Error> {
        if obj_ids.is_empty() {
            return Ok(());
        }
        let obj_ids: Vec<&String> = obj_ids.into_iter().collect();

        sql_query(Self::insert_update_layer_query())
            .bind::<Integer, _>(infra)
            .bind::<Array<Text>, _>(&obj_ids)
            .execute(conn)?;
        Ok(())
    }

    /// Delete some object from the layer
    fn delete_list(
        conn: &PgConnection,
        infra: i32,
        obj_ids: HashSet<&String>,
    ) -> Result<(), Error> {
        if obj_ids.is_empty() {
            return Ok(());
        }

        let obj_ids: Vec<&String> = obj_ids.into_iter().collect();

        sql_query(format!(
            "DELETE FROM {} WHERE infra_id = $1 AND obj_id = ANY($2)",
            Self::get_table_name()
        ))
        .bind::<Integer, _>(infra)
        .bind::<Array<Text>, _>(&obj_ids)
        .execute(conn)?;

        Ok(())
    }

    /// Search and update all detectors that needs to be refreshed given a list of operation.
    fn update(
        conn: &PgConnection,
        infra: i32,
        operations: &Vec<OperationResult>,
        infra_cache: &InfraCache,
        invalid_zone: &InvalidationZone,
        chartos_config: &ChartosConfig,
    ) -> Result<(), Error> {
        let mut update_obj_ids = HashSet::new();
        let mut delete_obj_ids = HashSet::new();
        for op in operations {
            match op {
                OperationResult::Create(RailjsonObject::TrackSection { railjson })
                | OperationResult::Update(RailjsonObject::TrackSection { railjson }) => {
                    fill_objects_track_refs(
                        infra_cache,
                        &railjson.id,
                        Self::get_obj_type(),
                        &mut update_obj_ids,
                    )
                }
                OperationResult::Create(railjson) | OperationResult::Update(railjson)
                    if railjson.get_type() == Self::get_obj_type() =>
                {
                    update_obj_ids.insert(railjson.get_id());
                }
                OperationResult::Delete(obj_ref) if obj_ref.obj_type == Self::get_obj_type() => {
                    delete_obj_ids.insert(&obj_ref.obj_id);
                }
                _ => (),
            }
        }

        if update_obj_ids.is_empty() && delete_obj_ids.is_empty() {
            // No update needed
            return Ok(());
        }

        Self::delete_list(conn, infra, delete_obj_ids)?;
        Self::insert_update_list(conn, infra, update_obj_ids)?;

        invalidate_bbox_chartos_layer(infra, Self::layer_name(), invalid_zone, chartos_config);

        Ok(())
    }
}

/// Given an infra cache, fill results with all the objects ID of type `obj_type` that have a reference to the given `track_id`.
fn fill_objects_track_refs<'a>(
    infra_cache: &'a InfraCache,
    track_id: &String,
    obj_type: ObjectType,
    results: &mut HashSet<&'a String>,
) {
    infra_cache
        .get_track_refs_type(track_id, obj_type)
        .iter()
        .for_each(|obj_ref| {
            results.insert(&obj_ref.obj_id);
        });
}
