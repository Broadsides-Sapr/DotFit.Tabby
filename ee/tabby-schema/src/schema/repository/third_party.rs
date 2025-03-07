use async_trait::async_trait;
use chrono::{DateTime, Utc};
use juniper::{GraphQLObject, ID};

use super::Repository;
use crate::{integration::IntegrationKind, juniper::relay::NodeType, schema::Result, Context};

#[derive(GraphQLObject)]
#[graphql(context = Context)]
pub struct ProvidedRepository {
    pub id: ID,
    pub integration_id: ID,
    pub active: bool,
    pub display_name: String,
    pub git_url: String,
    pub vendor_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl NodeType for ProvidedRepository {
    type Cursor = String;

    fn cursor(&self) -> Self::Cursor {
        self.id.to_string()
    }

    fn connection_type_name() -> &'static str {
        "ProvidedRepositoryConnection"
    }

    fn edge_type_name() -> &'static str {
        "ProvidedRepositoryEdge"
    }
}

#[async_trait]
pub trait ThirdPartyRepositoryService: Send + Sync {
    async fn list_repositories(
        &self,
        integration_ids: Option<Vec<ID>>,
        kind: Option<IntegrationKind>,
        active: Option<bool>,
        after: Option<String>,
        before: Option<String>,
        first: Option<usize>,
        last: Option<usize>,
    ) -> Result<Vec<ProvidedRepository>>;

    async fn repository_list(&self) -> Result<Vec<Repository>>;

    async fn get_repository(&self, id: ID) -> Result<ProvidedRepository>;

    async fn update_repository_active(&self, id: ID, active: bool) -> Result<()>;
    async fn upsert_repository(
        &self,
        integration_id: ID,
        vendor_id: String,
        display_name: String,
        git_url: String,
    ) -> Result<()>;
    async fn list_active_git_urls(&self) -> Result<Vec<String>>;
    async fn sync_repositories(&self, integration_id: ID) -> Result<()>;
    async fn delete_outdated_repositories(
        &self,
        integration_id: ID,
        before: DateTime<Utc>,
    ) -> Result<usize>;
}
