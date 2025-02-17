use crate::infra_cache::Cache;
use crate::infra_cache::ObjectCache;
use crate::layer::Layer;

use super::generate_id;
use super::OSRDObject;
use super::ObjectRef;
use super::ObjectType;
use derivative::Derivative;
use serde::{Deserialize, Serialize};

#[derive(Debug, Derivative, Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
#[derivative(Default)]
pub struct OperationalPoint {
    #[derivative(Default(value = r#"generate_id("operational_point")"#))]
    pub id: String,
    pub parts: Vec<OperationalPointPart>,
    pub uic: i64,
    pub ci: i64,
    pub ch: String,
    pub ch_short_label: Option<String>,
    pub ch_long_label: Option<String>,
    pub name: String,
    pub trigram: String,
}

impl OSRDObject for OperationalPoint {
    fn get_type(&self) -> ObjectType {
        ObjectType::OperationalPoint
    }

    fn get_id(&self) -> &String {
        &self.id
    }
}

#[derive(Debug, Derivative, Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
#[derivative(Default)]
pub struct OperationalPointPart {
    pub track: ObjectRef,
    pub position: f64,
}

impl Layer for OperationalPoint {
    fn get_table_name() -> &'static str {
        "osrd_infra_operationalpointlayer"
    }

    fn generate_layer_query() -> &'static str {
        include_str!("../layer/sql/generate_operational_point_layer.sql")
    }

    fn insert_update_layer_query() -> &'static str {
        include_str!("../layer/sql/insert_operational_point_layer.sql")
    }

    fn layer_name() -> &'static str {
        "operational_points"
    }

    fn get_obj_type() -> ObjectType {
        ObjectType::OperationalPoint
    }
}

#[derive(Debug, Clone, Derivative)]
#[derivative(Hash, PartialEq)]
pub struct OperationalPointCache {
    pub obj_id: String,
    #[derivative(Hash = "ignore", PartialEq = "ignore")]
    pub parts: Vec<OperationalPointPart>,
}

impl OperationalPointCache {
    pub fn new(obj_id: String, parts: Vec<OperationalPointPart>) -> Self {
        Self { obj_id, parts }
    }
}

impl From<OperationalPoint> for OperationalPointCache {
    fn from(op: OperationalPoint) -> Self {
        Self::new(op.id, op.parts)
    }
}

impl OSRDObject for OperationalPointCache {
    fn get_type(&self) -> ObjectType {
        ObjectType::OperationalPoint
    }

    fn get_id(&self) -> &String {
        &self.obj_id
    }
}

impl Cache for OperationalPointCache {
    fn get_track_referenced_id(&self) -> Vec<&String> {
        self.parts.iter().map(|tr| &tr.track.obj_id).collect()
    }

    fn get_object_cache(&self) -> ObjectCache {
        ObjectCache::OperationalPoint(self.clone())
    }
}
