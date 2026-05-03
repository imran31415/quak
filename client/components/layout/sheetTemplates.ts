import type { ColumnConfig } from '@shared/types';

export type TemplateColumn = Omit<ColumnConfig, 'id'>;

export interface SheetTemplate {
  key: string;
  label: string;
  description: string;
  group: 'starter' | 'example';
  columns: TemplateColumn[];
  sampleRows?: Record<string, unknown>[];
}

const STARTER_TEMPLATES: SheetTemplate[] = [
  {
    key: 'blank',
    label: 'Blank',
    description: 'One text column',
    group: 'starter',
    columns: [{ name: 'Column 1', cellType: 'text', width: 200 }],
  },
  {
    key: 'tasks',
    label: 'Task Tracker',
    description: 'Simple personal task list',
    group: 'starter',
    columns: [
      { name: 'Name', cellType: 'text', width: 200 },
      { name: 'Value', cellType: 'number', width: 120 },
      { name: 'Done', cellType: 'checkbox', width: 80 },
      { name: 'Status', cellType: 'dropdown', width: 120, options: ['Todo', 'In Progress', 'Done'] },
      { name: 'Due Date', cellType: 'date', width: 130 },
      { name: 'Notes', cellType: 'markdown', width: 250 },
    ],
  },
  {
    key: 'budget',
    label: 'Budget',
    description: 'Simple income/expense ledger',
    group: 'starter',
    columns: [
      { name: 'Item', cellType: 'text', width: 200 },
      { name: 'Amount', cellType: 'number', width: 120 },
      { name: 'Category', cellType: 'dropdown', width: 150, options: ['Income', 'Housing', 'Food', 'Transport', 'Other'] },
      { name: 'Date', cellType: 'date', width: 130 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Example: Software Migration — 6-month, 50-person enterprise project
// ---------------------------------------------------------------------------

const MIGRATION_PHASES = ['Discovery', 'Planning', 'Migration', 'Testing', 'Cutover', 'Post-launch'] as const;
const MIGRATION_PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;
const MIGRATION_STATUSES = ['Todo', 'In Progress', 'Blocked', 'Review', 'Done'] as const;

interface MigrationTask {
  Task: string;
  Phase: typeof MIGRATION_PHASES[number];
  Assignee: string;
  Priority: typeof MIGRATION_PRIORITIES[number];
  Status: typeof MIGRATION_STATUSES[number];
  Estimate: number;
  'Start Date': string;
  'Due Date': string;
  Done: boolean;
  Notes: string;
}

const MIGRATION_TASKS: MigrationTask[] = [
  // Discovery — Jan 6 → Jan 24
  { Task: 'Inventory monolith services and runtime dependencies', Phase: 'Discovery', Assignee: 'Tomás Ferreira', Priority: 'P0', Status: 'Done', Estimate: 32, 'Start Date': '2026-01-06', 'Due Date': '2026-01-13', Done: true, Notes: 'Generated dependency graph from JAR manifests; ~340 internal modules.' },
  { Task: 'Map ERD and identify shared tables across domains', Phase: 'Discovery', Assignee: 'Mei Lin Chen', Priority: 'P0', Status: 'Done', Estimate: 40, 'Start Date': '2026-01-06', 'Due Date': '2026-01-15', Done: true, Notes: 'Surfaced 12 cross-domain tables — flagged for owner negotiation.' },
  { Task: 'Audit external integrations (payments, shipping, tax)', Phase: 'Discovery', Assignee: 'Hana Kobayashi', Priority: 'P1', Status: 'Done', Estimate: 24, 'Start Date': '2026-01-07', 'Due Date': '2026-01-14', Done: true, Notes: '7 third-party APIs; 2 contracts up for renewal mid-migration.' },
  { Task: 'Stakeholder interviews — Order, Inventory, Customer leads', Phase: 'Discovery', Assignee: 'Daniel Okafor', Priority: 'P1', Status: 'Done', Estimate: 16, 'Start Date': '2026-01-08', 'Due Date': '2026-01-16', Done: true, Notes: '15 interviews completed; full transcripts in /eng-migration/discovery.' },
  { Task: 'Capture monolith SLO baseline (latency, error rate)', Phase: 'Discovery', Assignee: 'Rashid Al-Mansoori', Priority: 'P0', Status: 'Done', Estimate: 20, 'Start Date': '2026-01-08', 'Due Date': '2026-01-17', Done: true, Notes: 'p99 checkout = 1.8s; baseline doc shared with steering.' },
  { Task: 'Identify critical paths via Datadog APM', Phase: 'Discovery', Assignee: 'Rashid Al-Mansoori', Priority: 'P1', Status: 'Done', Estimate: 16, 'Start Date': '2026-01-12', 'Due Date': '2026-01-19', Done: true, Notes: 'Top 5 critical paths drive 80% of revenue.' },
  { Task: 'Document RPO/RTO requirements per domain', Phase: 'Discovery', Assignee: 'Elena Rodríguez', Priority: 'P0', Status: 'Done', Estimate: 12, 'Start Date': '2026-01-12', 'Due Date': '2026-01-19', Done: true, Notes: 'Order: RTO 5min, RPO 0. Customer: RTO 15min, RPO 5min.' },
  { Task: 'Catalog batch jobs and scheduler dependencies', Phase: 'Discovery', Assignee: 'Klara Nowak', Priority: 'P2', Status: 'Done', Estimate: 24, 'Start Date': '2026-01-13', 'Due Date': '2026-01-22', Done: true, Notes: '47 batch jobs; 3 have undocumented inputs — need source-tracing.' },
  { Task: 'Threat-model target microservices architecture', Phase: 'Discovery', Assignee: 'Zara Williams', Priority: 'P0', Status: 'Done', Estimate: 32, 'Start Date': '2026-01-13', 'Due Date': '2026-01-23', Done: true, Notes: 'STRIDE doc complete; 4 high-severity items routed to platform team.' },
  { Task: 'Catalog feature flags and config sources', Phase: 'Discovery', Assignee: 'Ben Schultz', Priority: 'P2', Status: 'Done', Estimate: 16, 'Start Date': '2026-01-14', 'Due Date': '2026-01-22', Done: true, Notes: '212 active flags; 64 are dead — flagged for cleanup.' },

  // Planning — Jan 20 → Feb 14
  { Task: 'RFC: target microservices architecture', Phase: 'Planning', Assignee: 'Elena Rodríguez', Priority: 'P0', Status: 'Done', Estimate: 40, 'Start Date': '2026-01-20', 'Due Date': '2026-01-30', Done: true, Notes: 'Approved at ARB on 1/29; minor revisions to service-mesh choice.' },
  { Task: 'RFC: data migration strategy (CDC + dual-write)', Phase: 'Planning', Assignee: 'Hiroshi Yamamoto', Priority: 'P0', Status: 'Done', Estimate: 32, 'Start Date': '2026-01-20', 'Due Date': '2026-02-02', Done: true, Notes: 'Debezium for CDC; dual-write only for Customer profile.' },
  { Task: 'Vendor selection: cloud commitments (AWS)', Phase: 'Planning', Assignee: 'Marcus Chen', Priority: 'P1', Status: 'Done', Estimate: 24, 'Start Date': '2026-01-22', 'Due Date': '2026-02-04', Done: true, Notes: 'EDP signed; $4.2M annual commit, 3-year term.' },
  { Task: 'Capacity & cost forecast for steady-state', Phase: 'Planning', Assignee: 'Helena Stojanović', Priority: 'P1', Status: 'Done', Estimate: 20, 'Start Date': '2026-01-23', 'Due Date': '2026-02-05', Done: true, Notes: 'Forecast: $310k/mo at peak; under 5% over current spend.' },
  { Task: 'Define RACI matrix across migration teams', Phase: 'Planning', Assignee: 'Daniel Okafor', Priority: 'P1', Status: 'Done', Estimate: 12, 'Start Date': '2026-01-26', 'Due Date': '2026-02-02', Done: true, Notes: 'Sign-off from all 6 squad leads.' },
  { Task: 'Define rollback playbook and acceptance criteria', Phase: 'Planning', Assignee: 'Erin O\'Sullivan', Priority: 'P0', Status: 'Done', Estimate: 24, 'Start Date': '2026-01-27', 'Due Date': '2026-02-09', Done: true, Notes: 'Rollback under 15 min via DNS + ALB switch; tested in staging.' },
  { Task: 'Training plan for engineering org', Phase: 'Planning', Assignee: 'Bobby Tran', Priority: 'P2', Status: 'Done', Estimate: 16, 'Start Date': '2026-01-28', 'Due Date': '2026-02-10', Done: true, Notes: 'K8s 101, Istio, observability — 6 sessions scheduled.' },
  { Task: 'Set up migration tracker dashboard (this sheet!)', Phase: 'Planning', Assignee: 'Daniel Okafor', Priority: 'P2', Status: 'Done', Estimate: 8, 'Start Date': '2026-02-02', 'Due Date': '2026-02-06', Done: true, Notes: 'Linked to Jira, Slack, and weekly steering report.' },
  { Task: 'Negotiate downtime windows with Sales/Support', Phase: 'Planning', Assignee: 'Marcus Chen', Priority: 'P1', Status: 'Done', Estimate: 8, 'Start Date': '2026-02-03', 'Due Date': '2026-02-10', Done: true, Notes: 'Two 15-minute maintenance windows: 5/16 and 5/17, 04:00 UTC.' },
  { Task: 'Customer comms plan for cutover', Phase: 'Planning', Assignee: 'Marcus Chen', Priority: 'P2', Status: 'Done', Estimate: 8, 'Start Date': '2026-02-09', 'Due Date': '2026-02-13', Done: true, Notes: 'Drafted email + status-page banner; legal review pending.' },
  { Task: 'Slack channel + meeting cadence setup', Phase: 'Planning', Assignee: 'Aisha Patel', Priority: 'P3', Status: 'Done', Estimate: 4, 'Start Date': '2026-02-04', 'Due Date': '2026-02-06', Done: true, Notes: '#mig-steering, #mig-platform, #mig-data, daily standups.' },
  { Task: 'Pre-migration architecture review with executive team', Phase: 'Planning', Assignee: 'Priya Sharma', Priority: 'P1', Status: 'Done', Estimate: 8, 'Start Date': '2026-02-10', 'Due Date': '2026-02-13', Done: true, Notes: 'Green light from CEO/CTO; budget approved.' },

  // Migration — Feb 10 → May 8
  { Task: 'Bootstrap EKS clusters: dev / staging / prod', Phase: 'Migration', Assignee: 'Ravi Krishnan', Priority: 'P0', Status: 'Done', Estimate: 40, 'Start Date': '2026-02-10', 'Due Date': '2026-02-24', Done: true, Notes: '3 clusters across us-east-1, us-west-2; multi-AZ.' },
  { Task: 'Provision shared VPC, transit gateway, peering', Phase: 'Migration', Assignee: 'Anna Kowalski', Priority: 'P0', Status: 'Done', Estimate: 32, 'Start Date': '2026-02-10', 'Due Date': '2026-02-25', Done: true, Notes: 'Hub-and-spoke; on-prem via Direct Connect.' },
  { Task: 'Service mesh (Istio) baseline + mTLS rollout', Phase: 'Migration', Assignee: 'Yuki Tanaka', Priority: 'P1', Status: 'Done', Estimate: 36, 'Start Date': '2026-02-16', 'Due Date': '2026-03-06', Done: true, Notes: 'mTLS strict in dev/staging; permissive in prod until full rollout.' },
  { Task: 'Observability stack: Prometheus, Loki, Tempo', Phase: 'Migration', Assignee: 'James O\'Brien', Priority: 'P0', Status: 'Done', Estimate: 32, 'Start Date': '2026-02-17', 'Due Date': '2026-03-04', Done: true, Notes: 'Grafana dashboards templated per service.' },
  { Task: 'Centralized IAM via OIDC (Okta)', Phase: 'Migration', Assignee: 'Carlos Mendoza', Priority: 'P0', Status: 'Done', Estimate: 28, 'Start Date': '2026-02-18', 'Due Date': '2026-03-05', Done: true, Notes: 'Service-account-to-IAM-role binding via IRSA.' },
  { Task: 'CI/CD pipelines (GitHub Actions → ArgoCD)', Phase: 'Migration', Assignee: 'Dmitri Volkov', Priority: 'P0', Status: 'Done', Estimate: 40, 'Start Date': '2026-02-23', 'Due Date': '2026-03-13', Done: true, Notes: 'Trunk-based; auto-deploy to dev, manual gate to prod.' },
  { Task: 'Order service: scaffold + auth integration', Phase: 'Migration', Assignee: 'Lena Petrov', Priority: 'P0', Status: 'Done', Estimate: 32, 'Start Date': '2026-02-23', 'Due Date': '2026-03-09', Done: true, Notes: 'Generated from internal microservice template.' },
  { Task: 'Order service: place/update endpoints', Phase: 'Migration', Assignee: 'Owen Walsh', Priority: 'P0', Status: 'Done', Estimate: 60, 'Start Date': '2026-03-02', 'Due Date': '2026-03-23', Done: true, Notes: 'Handles 23 monolith endpoints; behind feature flag.' },
  { Task: 'Order service: query/list endpoints', Phase: 'Migration', Assignee: 'Akira Saito', Priority: 'P1', Status: 'Done', Estimate: 40, 'Start Date': '2026-03-09', 'Due Date': '2026-03-27', Done: true, Notes: 'Read-replica reads with 200ms staleness budget.' },
  { Task: 'Order service: dual-write to monolith + new', Phase: 'Migration', Assignee: 'Khadija Ndiaye', Priority: 'P0', Status: 'Done', Estimate: 50, 'Start Date': '2026-03-16', 'Due Date': '2026-04-06', Done: true, Notes: 'Async via Kafka; reconciliation job hourly.' },
  { Task: 'Order: ETL historical data (~40M rows)', Phase: 'Migration', Assignee: 'Wesley Adebayo', Priority: 'P0', Status: 'Done', Estimate: 64, 'Start Date': '2026-03-23', 'Due Date': '2026-04-13', Done: true, Notes: 'Used AWS Glue; 11h runtime; checksum validated.' },
  { Task: 'Order: cutover reads (5% canary → 100%)', Phase: 'Migration', Assignee: 'Lena Petrov', Priority: 'P0', Status: 'In Progress', Estimate: 24, 'Start Date': '2026-04-13', 'Due Date': '2026-04-27', Done: false, Notes: 'Currently at 50%; error rate ↓0.02% vs monolith.' },
  { Task: 'Inventory service: scaffold', Phase: 'Migration', Assignee: 'Ivan Petrov', Priority: 'P0', Status: 'Done', Estimate: 24, 'Start Date': '2026-03-02', 'Due Date': '2026-03-13', Done: true, Notes: 'Same template as Order; minimal deviation.' },
  { Task: 'Inventory: stock-level read API', Phase: 'Migration', Assignee: 'Mira Suzuki', Priority: 'P0', Status: 'Done', Estimate: 40, 'Start Date': '2026-03-13', 'Due Date': '2026-03-30', Done: true, Notes: 'Cached at edge; p99 < 50ms.' },
  { Task: 'Inventory: reservation/locking semantics', Phase: 'Migration', Assignee: 'Kofi Mensah', Priority: 'P0', Status: 'Done', Estimate: 56, 'Start Date': '2026-03-23', 'Due Date': '2026-04-17', Done: true, Notes: 'Compare-and-set via DynamoDB conditional writes.' },
  { Task: 'Inventory: Kafka event stream wiring', Phase: 'Migration', Assignee: 'Birgit Hansen', Priority: 'P1', Status: 'Done', Estimate: 32, 'Start Date': '2026-04-06', 'Due Date': '2026-04-24', Done: true, Notes: '3 consumer groups; replay tested.' },
  { Task: 'Inventory: ETL historical data', Phase: 'Migration', Assignee: 'Sahar Karimi', Priority: 'P0', Status: 'Done', Estimate: 40, 'Start Date': '2026-04-13', 'Due Date': '2026-04-30', Done: true, Notes: '8.4M SKU rows; 4h runtime.' },
  { Task: 'Inventory: cutover reads (canary → full)', Phase: 'Migration', Assignee: 'Tariq Mahmoud', Priority: 'P0', Status: 'In Progress', Estimate: 16, 'Start Date': '2026-04-27', 'Due Date': '2026-05-08', Done: false, Notes: 'Held at 25%; investigating elevated tail latency.' },
  { Task: 'Customer service: scaffold', Phase: 'Migration', Assignee: 'Lisa Yamamoto', Priority: 'P0', Status: 'Done', Estimate: 24, 'Start Date': '2026-03-09', 'Due Date': '2026-03-23', Done: true, Notes: 'Auth bridge to legacy via JWT exchange.' },
  { Task: 'Customer: profile + auth bridge', Phase: 'Migration', Assignee: 'Diego Castillo', Priority: 'P0', Status: 'Done', Estimate: 56, 'Start Date': '2026-03-16', 'Due Date': '2026-04-13', Done: true, Notes: 'Edge cases around social login resolved.' },
  { Task: 'Customer: address book + preferences', Phase: 'Migration', Assignee: 'Nia Adekunle', Priority: 'P1', Status: 'Done', Estimate: 32, 'Start Date': '2026-04-06', 'Due Date': '2026-04-24', Done: true, Notes: 'Schema drift from monolith addressed via migration script.' },
  { Task: 'PII handling review (legal + security signoff)', Phase: 'Migration', Assignee: 'Zara Williams', Priority: 'P0', Status: 'Done', Estimate: 24, 'Start Date': '2026-04-06', 'Due Date': '2026-04-20', Done: true, Notes: 'Approved with conditions: KMS rotation, access logs.' },
  { Task: 'Customer: ETL historical data', Phase: 'Migration', Assignee: 'Theo Müller', Priority: 'P0', Status: 'Done', Estimate: 48, 'Start Date': '2026-04-13', 'Due Date': '2026-05-04', Done: true, Notes: '12M customer rows; PII tokenization applied.' },
  { Task: 'Customer: cutover reads', Phase: 'Migration', Assignee: 'Gleb Sokolov', Priority: 'P0', Status: 'Todo', Estimate: 16, 'Start Date': '2026-05-04', 'Due Date': '2026-05-08', Done: false, Notes: 'Blocked on Inventory cutover finalization.' },
  { Task: 'Migrate batch jobs to AWS Step Functions', Phase: 'Migration', Assignee: 'Klara Nowak', Priority: 'P1', Status: 'In Progress', Estimate: 48, 'Start Date': '2026-04-06', 'Due Date': '2026-05-01', Done: false, Notes: '34/47 jobs ported; 3 require rewrite.' },
  { Task: 'Migrate cron jobs to k8s CronJobs', Phase: 'Migration', Assignee: 'Pim van der Berg', Priority: 'P2', Status: 'In Progress', Estimate: 24, 'Start Date': '2026-04-13', 'Due Date': '2026-05-04', Done: false, Notes: '12/19 ported.' },
  { Task: 'Cross-service distributed tracing', Phase: 'Migration', Assignee: 'James O\'Brien', Priority: 'P1', Status: 'Done', Estimate: 24, 'Start Date': '2026-03-30', 'Due Date': '2026-04-17', Done: true, Notes: 'OpenTelemetry instrumented in all services.' },
  { Task: 'SLO dashboards per service', Phase: 'Migration', Assignee: 'James O\'Brien', Priority: 'P1', Status: 'Done', Estimate: 16, 'Start Date': '2026-04-13', 'Due Date': '2026-04-27', Done: true, Notes: 'Grafana SLO library; alerts in PagerDuty.' },
  { Task: 'Cost alerts & budgets (CloudWatch)', Phase: 'Migration', Assignee: 'Ahmed Hassan', Priority: 'P2', Status: 'Done', Estimate: 8, 'Start Date': '2026-04-20', 'Due Date': '2026-04-27', Done: true, Notes: 'Per-service budgets with 50/80/100% alerts.' },
  { Task: 'Feature flag service migration to LaunchDarkly', Phase: 'Migration', Assignee: 'Pablo Gómez', Priority: 'P3', Status: 'Blocked', Estimate: 24, 'Start Date': '2026-04-20', 'Due Date': '2026-05-08', Done: false, Notes: 'Blocked: procurement signature pending.' },
  { Task: 'Edge / CDN configuration migration', Phase: 'Migration', Assignee: 'Naledi Dlamini', Priority: 'P2', Status: 'In Progress', Estimate: 20, 'Start Date': '2026-04-20', 'Due Date': '2026-05-08', Done: false, Notes: 'CloudFront distributions provisioned; cert pinning in progress.' },
  { Task: 'Storage class migration (EBS → EFS for shared)', Phase: 'Migration', Assignee: 'Petra Schneider', Priority: 'P2', Status: 'Done', Estimate: 16, 'Start Date': '2026-04-13', 'Due Date': '2026-04-30', Done: true, Notes: 'Only the legacy file-import job needs EFS.' },

  // Testing — Mar 9 → May 15
  { Task: 'Build cross-service integration test suite', Phase: 'Testing', Assignee: 'Jin-Ho Park', Priority: 'P0', Status: 'Done', Estimate: 56, 'Start Date': '2026-03-09', 'Due Date': '2026-04-03', Done: true, Notes: '420 scenarios; runs nightly + per-PR for affected services.' },
  { Task: 'Build perf test harness (k6 + replay)', Phase: 'Testing', Assignee: 'Greta Andersson', Priority: 'P1', Status: 'Done', Estimate: 32, 'Start Date': '2026-03-16', 'Due Date': '2026-04-06', Done: true, Notes: 'Replays 1 hour of prod traffic at variable speed.' },
  { Task: 'Perf baseline against monolith', Phase: 'Testing', Assignee: 'Greta Andersson', Priority: 'P1', Status: 'Done', Estimate: 16, 'Start Date': '2026-04-06', 'Due Date': '2026-04-13', Done: true, Notes: 'Baseline captured for 3 critical paths.' },
  { Task: 'Load test Order service to 2× peak', Phase: 'Testing', Assignee: 'Camila Reyes', Priority: 'P0', Status: 'Done', Estimate: 16, 'Start Date': '2026-04-13', 'Due Date': '2026-04-20', Done: true, Notes: 'Held SLO at 2.4× peak; CPU breach at 3×.' },
  { Task: 'Load test Inventory service to 2× peak', Phase: 'Testing', Assignee: 'Camila Reyes', Priority: 'P0', Status: 'Done', Estimate: 16, 'Start Date': '2026-04-20', 'Due Date': '2026-04-27', Done: true, Notes: 'Stable; recommend +20% pod headroom.' },
  { Task: 'Load test Customer service to 2× peak', Phase: 'Testing', Assignee: 'Thabo Sithole', Priority: 'P1', Status: 'In Progress', Estimate: 16, 'Start Date': '2026-04-27', 'Due Date': '2026-05-04', Done: false, Notes: 'Currently running; partial result: SLO held at 1.8×.' },
  { Task: 'Chaos: pod evictions during checkout', Phase: 'Testing', Assignee: 'Thabo Sithole', Priority: 'P1', Status: 'Done', Estimate: 12, 'Start Date': '2026-04-13', 'Due Date': '2026-04-20', Done: true, Notes: 'No user-visible errors; PDB working as intended.' },
  { Task: 'Chaos: DB failover during writes', Phase: 'Testing', Assignee: 'Hiroshi Yamamoto', Priority: 'P0', Status: 'Done', Estimate: 16, 'Start Date': '2026-04-20', 'Due Date': '2026-04-27', Done: true, Notes: '11 second failover; 0 data loss.' },
  { Task: 'UAT with internal Order/Sales/Support', Phase: 'Testing', Assignee: 'Ben Schultz', Priority: 'P1', Status: 'In Progress', Estimate: 24, 'Start Date': '2026-04-27', 'Due Date': '2026-05-11', Done: false, Notes: '12 of 18 scripts signed off.' },
  { Task: 'Security pentest of new public APIs', Phase: 'Testing', Assignee: 'Fatima Hassan', Priority: 'P0', Status: 'In Progress', Estimate: 40, 'Start Date': '2026-04-27', 'Due Date': '2026-05-11', Done: false, Notes: 'Vendor: SecureWorks; midpoint readout 5/4.' },
  { Task: 'Validate observability completeness', Phase: 'Testing', Assignee: 'James O\'Brien', Priority: 'P2', Status: 'Done', Estimate: 8, 'Start Date': '2026-04-27', 'Due Date': '2026-05-01', Done: true, Notes: 'Coverage matrix shared with on-call.' },
  { Task: 'End-to-end smoke test in staging', Phase: 'Testing', Assignee: 'Camila Reyes', Priority: 'P0', Status: 'Todo', Estimate: 8, 'Start Date': '2026-05-04', 'Due Date': '2026-05-08', Done: false, Notes: 'Full critical-path run prior to cutover.' },
  { Task: 'Production-like data reconciliation tests', Phase: 'Testing', Assignee: 'Hiroshi Yamamoto', Priority: 'P0', Status: 'Todo', Estimate: 12, 'Start Date': '2026-05-04', 'Due Date': '2026-05-11', Done: false, Notes: 'Compare row-count + checksums monolith vs new.' },
  { Task: 'Disaster recovery drill (full failover)', Phase: 'Testing', Assignee: 'Erin O\'Sullivan', Priority: 'P1', Status: 'Todo', Estimate: 16, 'Start Date': '2026-05-04', 'Due Date': '2026-05-15', Done: false, Notes: 'Drill scheduled 5/12, 22:00 UTC; staging only.' },
  { Task: 'On-call playbooks per service', Phase: 'Testing', Assignee: 'Vikram Iyer', Priority: 'P1', Status: 'In Progress', Estimate: 16, 'Start Date': '2026-04-27', 'Due Date': '2026-05-11', Done: false, Notes: '8/12 playbooks drafted; reviewing with SRE.' },

  // Cutover — May 11 → May 22
  { Task: 'Final go/no-go review with steering committee', Phase: 'Cutover', Assignee: 'Priya Sharma', Priority: 'P0', Status: 'Todo', Estimate: 4, 'Start Date': '2026-05-11', 'Due Date': '2026-05-13', Done: false, Notes: 'Required attendees: CTO, VP Eng, VP Product, Sec lead.' },
  { Task: 'Customer comms: maintenance window announcement', Phase: 'Cutover', Assignee: 'Marcus Chen', Priority: 'P1', Status: 'Todo', Estimate: 4, 'Start Date': '2026-05-11', 'Due Date': '2026-05-13', Done: false, Notes: 'Email blast + status page + in-app banner.' },
  { Task: 'Final CDC catchup sync', Phase: 'Cutover', Assignee: 'Hiroshi Yamamoto', Priority: 'P0', Status: 'Todo', Estimate: 6, 'Start Date': '2026-05-15', 'Due Date': '2026-05-16', Done: false, Notes: 'T-30min before cutover; freeze writes 5 min beforehand.' },
  { Task: 'T-0: switch DNS / API gateway routes', Phase: 'Cutover', Assignee: 'Anna Kowalski', Priority: 'P0', Status: 'Todo', Estimate: 2, 'Start Date': '2026-05-16', 'Due Date': '2026-05-16', Done: false, Notes: 'Coordinated with cutover war-room call.' },
  { Task: 'Validate monitoring during cutover', Phase: 'Cutover', Assignee: 'Rashid Al-Mansoori', Priority: 'P0', Status: 'Todo', Estimate: 4, 'Start Date': '2026-05-16', 'Due Date': '2026-05-16', Done: false, Notes: 'Eyes on dashboards for first 60 min post-cut.' },
  { Task: 'Smoke test critical flows in production', Phase: 'Cutover', Assignee: 'Camila Reyes', Priority: 'P0', Status: 'Todo', Estimate: 4, 'Start Date': '2026-05-16', 'Due Date': '2026-05-17', Done: false, Notes: 'Real user accounts; minimum 5 critical paths.' },
  { Task: 'Decommission monolith write paths', Phase: 'Cutover', Assignee: 'Lena Petrov', Priority: 'P1', Status: 'Todo', Estimate: 8, 'Start Date': '2026-05-19', 'Due Date': '2026-05-22', Done: false, Notes: 'Stop dual-writes; flip kill switch on monolith.' },
  { Task: 'War room: 48h post-cutover', Phase: 'Cutover', Assignee: 'Daniel Okafor', Priority: 'P1', Status: 'Todo', Estimate: 16, 'Start Date': '2026-05-16', 'Due Date': '2026-05-18', Done: false, Notes: 'Rotation across timezones; bridge open continuously.' },

  // Post-launch — May 25 → Jun 19
  { Task: 'Stabilization: address top-10 incident-driven items', Phase: 'Post-launch', Assignee: 'Aisha Patel', Priority: 'P1', Status: 'Todo', Estimate: 40, 'Start Date': '2026-05-25', 'Due Date': '2026-06-12', Done: false, Notes: 'Pull from incident tracker; weekly review.' },
  { Task: 'Decommission monolith infrastructure', Phase: 'Post-launch', Assignee: 'Petra Schneider', Priority: 'P2', Status: 'Todo', Estimate: 24, 'Start Date': '2026-06-01', 'Due Date': '2026-06-15', Done: false, Notes: 'Includes RDS, EC2 fleet, on-prem DC handoff.' },
  { Task: 'Cost true-up vs forecast', Phase: 'Post-launch', Assignee: 'Helena Stojanović', Priority: 'P3', Status: 'Todo', Estimate: 8, 'Start Date': '2026-06-01', 'Due Date': '2026-06-08', Done: false, Notes: 'Compare 30-day actuals vs Feb forecast.' },
  { Task: 'Migration retrospective with full team', Phase: 'Post-launch', Assignee: 'Daniel Okafor', Priority: 'P2', Status: 'Todo', Estimate: 8, 'Start Date': '2026-06-08', 'Due Date': '2026-06-15', Done: false, Notes: 'All-hands; capture wins, regrets, action items.' },
  { Task: 'Knowledge-transfer sessions for ops/support', Phase: 'Post-launch', Assignee: 'Bobby Tran', Priority: 'P3', Status: 'Todo', Estimate: 12, 'Start Date': '2026-06-08', 'Due Date': '2026-06-19', Done: false, Notes: '4 sessions; recordings to internal wiki.' },
  { Task: 'Saanvi Agarwal: Customer service performance tuning', Phase: 'Post-launch', Assignee: 'Saanvi Agarwal', Priority: 'P3', Status: 'Todo', Estimate: 16, 'Start Date': '2026-06-01', 'Due Date': '2026-06-19', Done: false, Notes: 'Focus on session lookup p99 (currently borderline).' },
];

const SOFTWARE_MIGRATION_TEMPLATE: SheetTemplate = {
  key: 'example-software-migration',
  label: 'Software Migration',
  description: '50-person, 6-month enterprise migration tracker',
  group: 'example',
  columns: [
    { name: 'Task', cellType: 'text', width: 280, pinned: 'left' },
    { name: 'Phase', cellType: 'dropdown', width: 130, options: [...MIGRATION_PHASES] },
    { name: 'Assignee', cellType: 'text', width: 160 },
    { name: 'Priority', cellType: 'dropdown', width: 90, options: [...MIGRATION_PRIORITIES] },
    { name: 'Status', cellType: 'dropdown', width: 130, options: [...MIGRATION_STATUSES] },
    { name: 'Estimate', cellType: 'number', width: 90 },
    { name: 'Start Date', cellType: 'date', width: 120 },
    { name: 'Due Date', cellType: 'date', width: 120 },
    { name: 'Done', cellType: 'checkbox', width: 80 },
    { name: 'Notes', cellType: 'markdown', width: 320 },
  ],
  sampleRows: MIGRATION_TASKS as unknown as Record<string, unknown>[],
};

// ---------------------------------------------------------------------------
// Example: Personal Budget — 12 months of transactions
// ---------------------------------------------------------------------------

const BUDGET_CATEGORIES = [
  'Income', 'Housing', 'Food', 'Groceries', 'Transport', 'Utilities',
  'Healthcare', 'Entertainment', 'Subscriptions', 'Savings', 'Travel', 'Other',
] as const;

interface BudgetRow {
  Date: string;
  Description: string;
  Category: typeof BUDGET_CATEGORIES[number];
  Amount: number;
  Type: 'Income' | 'Expense';
  Recurring: boolean;
  Notes: string;
}

function makeBudgetRows(): BudgetRow[] {
  const rows: BudgetRow[] = [];
  const months = [
    '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
    '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
  ];
  for (const m of months) {
    rows.push({ Date: `${m}-01`, Description: 'Rent — apartment', Category: 'Housing', Amount: -2400, Type: 'Expense', Recurring: true, Notes: '' });
    rows.push({ Date: `${m}-03`, Description: 'Internet (Fiber Co.)', Category: 'Utilities', Amount: -75, Type: 'Expense', Recurring: true, Notes: '' });
    rows.push({ Date: `${m}-05`, Description: 'Phone bill', Category: 'Utilities', Amount: -55, Type: 'Expense', Recurring: true, Notes: '' });
    rows.push({ Date: `${m}-07`, Description: 'Streaming subscriptions (bundle)', Category: 'Subscriptions', Amount: -36, Type: 'Expense', Recurring: true, Notes: 'Netflix + Spotify family' });
    rows.push({ Date: `${m}-15`, Description: 'Paycheck', Category: 'Income', Amount: 4500, Type: 'Income', Recurring: true, Notes: 'Bi-weekly, after tax' });
    rows.push({ Date: `${m}-29`, Description: 'Paycheck', Category: 'Income', Amount: 4500, Type: 'Income', Recurring: true, Notes: 'Bi-weekly, after tax' });
    rows.push({ Date: `${m}-08`, Description: 'Grocery shopping', Category: 'Groceries', Amount: -120, Type: 'Expense', Recurring: true, Notes: '' });
    rows.push({ Date: `${m}-22`, Description: 'Grocery shopping', Category: 'Groceries', Amount: -135, Type: 'Expense', Recurring: true, Notes: '' });
    rows.push({ Date: `${m}-12`, Description: 'Gas — commute', Category: 'Transport', Amount: -55, Type: 'Expense', Recurring: true, Notes: '' });
    rows.push({ Date: `${m}-26`, Description: 'Gas — commute', Category: 'Transport', Amount: -50, Type: 'Expense', Recurring: true, Notes: '' });
    rows.push({ Date: `${m}-18`, Description: 'Auto-transfer to savings', Category: 'Savings', Amount: -800, Type: 'Expense', Recurring: true, Notes: 'Goes to high-yield savings' });
  }
  // One-offs sprinkled across the year
  rows.push({ Date: '2026-01-10', Description: 'New Year dinner out', Category: 'Food', Amount: -85, Type: 'Expense', Recurring: false, Notes: '' });
  rows.push({ Date: '2026-02-14', Description: 'Valentine\'s dinner', Category: 'Food', Amount: -140, Type: 'Expense', Recurring: false, Notes: '' });
  rows.push({ Date: '2026-03-04', Description: 'Annual physical', Category: 'Healthcare', Amount: -180, Type: 'Expense', Recurring: false, Notes: 'After insurance' });
  rows.push({ Date: '2026-04-15', Description: 'Federal taxes (refund)', Category: 'Income', Amount: 1240, Type: 'Income', Recurring: false, Notes: '' });
  rows.push({ Date: '2026-04-22', Description: 'Concert tickets', Category: 'Entertainment', Amount: -220, Type: 'Expense', Recurring: false, Notes: '2 tickets, GA' });
  rows.push({ Date: '2026-05-09', Description: 'Mother\'s Day flowers + brunch', Category: 'Other', Amount: -130, Type: 'Expense', Recurring: false, Notes: '' });
  rows.push({ Date: '2026-06-11', Description: 'Summer trip — flights', Category: 'Travel', Amount: -640, Type: 'Expense', Recurring: false, Notes: 'Round trip, mid-July' });
  rows.push({ Date: '2026-06-12', Description: 'Summer trip — hotel', Category: 'Travel', Amount: -880, Type: 'Expense', Recurring: false, Notes: '5 nights' });
  rows.push({ Date: '2026-07-04', Description: 'July 4th BBQ groceries', Category: 'Food', Amount: -75, Type: 'Expense', Recurring: false, Notes: '' });
  rows.push({ Date: '2026-07-20', Description: 'Performance bonus', Category: 'Income', Amount: 2500, Type: 'Income', Recurring: false, Notes: 'Mid-year bonus' });
  rows.push({ Date: '2026-08-16', Description: 'Car insurance — semi-annual', Category: 'Transport', Amount: -680, Type: 'Expense', Recurring: false, Notes: '' });
  rows.push({ Date: '2026-09-02', Description: 'Back-to-school supplies', Category: 'Other', Amount: -95, Type: 'Expense', Recurring: false, Notes: '' });
  rows.push({ Date: '2026-09-25', Description: 'Birthday gift for partner', Category: 'Other', Amount: -150, Type: 'Expense', Recurring: false, Notes: '' });
  rows.push({ Date: '2026-10-31', Description: 'Halloween costumes', Category: 'Entertainment', Amount: -55, Type: 'Expense', Recurring: false, Notes: '' });
  rows.push({ Date: '2026-11-04', Description: 'Dental cleaning', Category: 'Healthcare', Amount: -90, Type: 'Expense', Recurring: false, Notes: 'Co-pay' });
  rows.push({ Date: '2026-11-27', Description: 'Thanksgiving travel', Category: 'Travel', Amount: -310, Type: 'Expense', Recurring: false, Notes: 'Train + cab' });
  rows.push({ Date: '2026-12-15', Description: 'Holiday gifts', Category: 'Other', Amount: -420, Type: 'Expense', Recurring: false, Notes: 'Family + close friends' });
  rows.push({ Date: '2026-12-22', Description: 'New laptop', Category: 'Other', Amount: -1300, Type: 'Expense', Recurring: false, Notes: 'Personal upgrade' });
  rows.push({ Date: '2026-12-31', Description: 'Year-end bonus', Category: 'Income', Amount: 3200, Type: 'Income', Recurring: false, Notes: 'After tax' });

  // Sort by date for nicer presentation
  return rows.sort((a, b) => a.Date.localeCompare(b.Date));
}

const PERSONAL_BUDGET_TEMPLATE: SheetTemplate = {
  key: 'example-personal-budget',
  label: 'Personal Budget',
  description: '12 months of transactions across categories',
  group: 'example',
  columns: [
    { name: 'Date', cellType: 'date', width: 120 },
    { name: 'Description', cellType: 'text', width: 260 },
    { name: 'Category', cellType: 'dropdown', width: 140, options: [...BUDGET_CATEGORIES] },
    { name: 'Amount', cellType: 'number', width: 120 },
    { name: 'Type', cellType: 'dropdown', width: 100, options: ['Income', 'Expense'] },
    { name: 'Recurring', cellType: 'checkbox', width: 100 },
    { name: 'Notes', cellType: 'text', width: 220 },
  ],
  sampleRows: makeBudgetRows() as unknown as Record<string, unknown>[],
};

const EXAMPLE_TEMPLATES: SheetTemplate[] = [
  SOFTWARE_MIGRATION_TEMPLATE,
  PERSONAL_BUDGET_TEMPLATE,
];

export const SHEET_TEMPLATES: SheetTemplate[] = [...STARTER_TEMPLATES, ...EXAMPLE_TEMPLATES];

export function getTemplate(key: string): SheetTemplate | undefined {
  return SHEET_TEMPLATES.find((t) => t.key === key);
}

export function templateToColumns(tmpl: SheetTemplate): ColumnConfig[] {
  return tmpl.columns.map((c) => ({
    id: c.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
    ...c,
  }));
}
