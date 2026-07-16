export const mockProjectData = {
  projectName: "Project Horizon - Ride Sharing Platform",
  healthScore: 74,
  requirementsCount: 142,
  metrics: {
    criticalIssues: 3,
    mediumIssues: 6,
    lowIssues: 8,
    savedHours: 42
  },
  executiveSummary: "SpecLens AI completed the design review across 4 submitted documents. We cross-referenced 142 requirements and found 17 issues in total. The primary risk is a Critical Security Policy Contradiction where user password guidelines contradict the PRD's 'one-click social sign-in' requirement. Additionally, a technical mismatch exists between the API Spec (Adyen, async) and the PRD (Stripe, sync). Resolving these before engineering kickoff is highly recommended.",
  
  documents: [
    { id: "doc-1", name: "PRD_v1.0_Horizon.docx", size: "2.4 MB", type: "DOCX", status: "Processed", uploadDate: "2026-07-15" },
    { id: "doc-2", name: "Payment_API_Spec_v1.1.yaml", size: "842 KB", type: "YAML", status: "Processed", uploadDate: "2026-07-15" },
    { id: "doc-3", name: "Corporate_Security_Requirements.pdf", size: "4.1 MB", type: "PDF", status: "Processed", uploadDate: "2026-07-15" },
    { id: "doc-4", name: "Cloud_Arch_Draft.md", size: "120 KB", type: "MD", status: "Processed", uploadDate: "2026-07-15" }
  ],
  
  findings: [
    {
      id: "SPEC-001",
      title: "Authentication Policy Conflict",
      category: "Contradictions",
      severity: "Critical",
      summary: "Social-only logins in the PRD bypass password policies defined in Corporate Security guidelines.",
      description: "The Product Requirements Document (PRD) explicitly calls for a 'one-click social-only onboarding' (via Google and Apple) to minimize onboarding friction. However, the Corporate Security Requirements document mandates standard password checks, MFA configuration, and password rotations every 90 days.",
      documents: ["PRD_v1.0_Horizon.docx", "Corporate_Security_Requirements.pdf"],
      location: "PRD Section 3.2 vs Security Specs Page 14",
      excerptA: "PRD Section 3.2: 'To maximize signup conversion rates, Horizon will support social-only signup (Google & Apple) with zero required password credentials...'",
      excerptB: "Security Specs Page 14: 'All customer-facing portals must implement a secure password login with a minimum of 8 characters, including 1 uppercase, 1 special character, and mandatory Multi-Factor Authentication (MFA)...'",
      remedy: "Enable social login but enforce backend mapping to a security credentials provider that prompts for standard MFA setup on first purchase, or update security rules to exempt standard social sign-ins."
    },
    {
      id: "SPEC-002",
      title: "Payment Gateway Mismatch",
      category: "Contradictions",
      severity: "Critical",
      summary: "Discrepancy in payment provider and sync processing model.",
      description: "The API specification file integrates with Adyen using an asynchronous webhook response system. In contrast, the PRD specifies a synchronous, zero-latency payment completion utilizing Stripe checkout modal API. If left unaligned, the checkout flow UI will break during integration testing.",
      documents: ["PRD_v1.0_Horizon.docx", "Payment_API_Spec_v1.1.yaml"],
      location: "PRD Section 5.4.1 vs API Specs Endpoint `/v1/checkout`",
      excerptA: "PRD Section 5.4.1: 'Upon clicking Buy, the Stripe checkout overlay loads synchronously. The user payment is processed immediately, and success is rendered in < 1.5 seconds.'",
      excerptB: "API Specs: 'POST /v1/checkout initiates an async transaction with Adyen. Returns standard HTTP 202 Accepted. The frontend must listen to the webhook event `/webhooks/adyen-complete` to render checkout status.'",
      remedy: "Align the engineering spec. Recommend migrating the API spec to support synchronous authorization if immediate frontend feedback is required, or update the PRD to specify a polling/waiting state UI while webhook is pending."
    },
    {
      id: "SPEC-003",
      title: "Temporary Storage Lifecycle Ambiguity",
      category: "Ambiguities",
      severity: "Medium",
      summary: "Retention period and privacy guidelines for media storage not defined.",
      description: "The Cloud Architecture Draft details that 'user media uploads will be cached in an Amazon S3 bucket designated for temporary media assets.' However, the document does not specify a storage lifecycle policy (e.g. S3 Object Expiration) or access restriction policies to meet GDPR data compliance rules.",
      documents: ["Cloud_Arch_Draft.md"],
      location: "Cloud Arch Draft Section 2.5",
      excerptA: "Cloud Arch Draft Section 2.5: 'Images and videos uploaded by users during claims processing will be directed to `s3://horizon-temp-media-bucket`. System will clear these files periodically.'",
      excerptB: "No corresponding standard in compliance documents regarding file cleanup timing.",
      remedy: "Specify the exact retention timeline. Recommend configuring an S3 Lifecycle Rule to auto-expire files after 24 hours and logging compliance status to auditing service."
    },
    {
      id: "SPEC-004",
      title: "Undefined 'Quick Load' Metrics",
      category: "Ambiguities",
      severity: "Low",
      summary: "Non-functional performance requirements are subjective.",
      description: "The PRD mentions that 'the dashboard lists must load quickly to avoid user drop-off.' This is subjective and cannot be validated in automated testing or QA gating without a concrete SLA.",
      documents: ["PRD_v1.0_Horizon.docx"],
      location: "PRD Section 7.1",
      excerptA: "PRD Section 7.1: 'Performance: The rider transaction logs and history screens must load quickly on average 3G connections.'",
      excerptB: "N/A",
      remedy: "Define the performance SLA. E.g., 'API response time for user lists must be under 300ms (p95) on standard 3G simulated profiles, and Largest Contentful Paint (LCP) must be under 1.8 seconds.'"
    },
    {
      id: "SPEC-005",
      title: "GDPR User Erasure Missing",
      category: "Missing Requirements",
      severity: "Critical",
      summary: "No mechanisms outlined to support GDPR 'Right to be Forgotten' requests.",
      description: "While the data model details user registration and profile saving, there is no requirement or specification in any document (PRD or Cloud Arch) detailing user deletion, cascade deletion of driver history logs, or anonymization of payment records.",
      documents: ["PRD_v1.0_Horizon.docx", "Cloud_Arch_Draft.md"],
      location: "Entire Document Analysis",
      excerptA: "PRD: Details user onboarding, billing history, riding records but mentions no deletion mechanism.",
      excerptB: "Cloud Arch: Details database schemas and tables but has no anonymization logic or archive pipelines.",
      remedy: "Add a GDPR compliance section detailing an asynchronous deletion workflow that anonymizes trip coordinates (to protect driver privacy) while preserving tax records."
    },
    {
      id: "SPEC-006",
      title: "Rate Limiting and DDoS Protection",
      category: "Missing Requirements",
      severity: "Medium",
      summary: "API specs omit rate limiting standards.",
      description: "The API Specification has no rate limits configured for public endpoints like `/v1/auth/request-otp` or `/v1/ride/calculate-fare`. This exposes the backend infrastructure to brute-force SMS OTP cost exhaustion and CPU resource exhaustion from spam coordinates query.",
      documents: ["Payment_API_Spec_v1.1.yaml"],
      location: "API Specs Root Configuration",
      excerptA: "API Spec: Outlines API routes and parameters. Lacks any rate limit headers or status code 429 Too Many Requests descriptions.",
      excerptB: "N/A",
      remedy: "Introduce API rate-limiting rules. E.g., limit `/v1/auth/request-otp` to 3 requests per 10 minutes per IP/Phone, and limit fare calculations to 60 requests per minute."
    },
    {
      id: "SPEC-007",
      title: "Billing Service Dependency Sync Conflict",
      category: "Dependencies",
      severity: "Medium",
      summary: "Core onboarding depends on billing API scheduled for a later release phase.",
      description: "The onboarding user flow in the PRD is blocked on driver verification and payment method setup (requires Stripe payment profile API). However, the Payment API spec indicates the payment profile endpoints are scheduled for Development Phase 2, while Onboarding must go live in Phase 1.",
      documents: ["PRD_v1.0_Horizon.docx", "Payment_API_Spec_v1.1.yaml"],
      location: "PRD Milestone 1 vs Payment API Roadmap",
      excerptA: "PRD Milestone 1: 'Deliver full rider onboarding including ride calculation and payment option setup.'",
      excerptB: "Payment API Roadmap: 'Phase 2: Stripe Customer Mapping, Credit Card tokens integration, and subscription APIs.'",
      remedy: "Adjust milestones or provide mock services. Recommend stubbing the customer profile bindings in Phase 1 to let the onboarding team run tests, or pulling credit card tokenization forward into Phase 1."
    },
    {
      id: "SPEC-008",
      title: "External Geocoding API Keys Dependency",
      category: "Dependencies",
      severity: "Low",
      summary: "Google Maps SDK and API limits details are missing.",
      description: "The rider location parsing depends on the Google Maps Geocoding and Reverse Geocoding APIs. However, no setup guidelines, billing accounts, or token rotation strategies are listed in the Cloud Architecture draft, leading to potential delays during cloud infrastructure setup.",
      documents: ["Cloud_Arch_Draft.md"],
      location: "Cloud Arch Draft Section 4.1",
      excerptA: "Cloud Arch Draft: 'Address names will be converted to coordinates dynamically using Google Maps API.'",
      excerptB: "N/A",
      remedy: "Create a setup task in the infrastructure team dashboard to acquire API tokens, set up quota alerts, and configure key restrictions (e.g. restrict tokens to specific domain referrers)."
    }
  ],
  
  graphData: {
    nodes: [
      { id: "PRD", label: "PRD_v1.0_Horizon.docx", type: "document", x: 250, y: 150, radius: 45, color: "#6366f1" },
      { id: "API", label: "Payment_API_Spec_v1.1.yaml", type: "document", x: 550, y: 150, radius: 45, color: "#3b82f6" },
      { id: "SEC", label: "Corporate_Security_Requirements.pdf", type: "document", x: 250, y: 400, radius: 45, color: "#ec4899" },
      { id: "ARC", label: "Cloud_Arch_Draft.md", type: "document", x: 550, y: 400, radius: 45, color: "#10b981" },
      // Highlighted issues as mini-nodes
      { id: "ISS-1", label: "Auth Conflict", type: "issue", severity: "Critical", x: 250, y: 275, radius: 18, color: "#ef4444" },
      { id: "ISS-2", label: "Payment Mismatch", type: "issue", severity: "Critical", x: 400, y: 150, radius: 18, color: "#ef4444" },
      { id: "ISS-3", label: "GDPR Deletion", type: "issue", severity: "Critical", x: 400, y: 275, radius: 18, color: "#ef4444" },
      { id: "ISS-4", label: "Billing Conflict", type: "issue", severity: "Medium", x: 400, y: 400, radius: 18, color: "#f59e0b" }
    ],
    links: [
      // Connections from documents to issues
      { source: "PRD", target: "ISS-1", color: "#ef4444", width: 2, dashed: true, text: "Bypasses credentials" },
      { source: "SEC", target: "ISS-1", color: "#ef4444", width: 2, dashed: true, text: "Mandates MFA & Password" },
      
      { source: "PRD", target: "ISS-2", color: "#ef4444", width: 2, dashed: true, text: "Requests Stripe (Sync)" },
      { source: "API", target: "ISS-2", color: "#ef4444", width: 2, dashed: true, text: "Implements Adyen (Async)" },
      
      { source: "PRD", target: "ISS-3", color: "#ef4444", width: 1.5, dashed: false, text: "Omit profile erasure" },
      { source: "ARC", target: "ISS-3", color: "#ef4444", width: 1.5, dashed: false, text: "Omit data purging" },

      { source: "PRD", target: "ISS-4", color: "#f59e0b", width: 1.5, dashed: true, text: "Needs Stripe customer token" },
      { source: "API", target: "ISS-4", color: "#f59e0b", width: 1.5, dashed: true, text: "Delivers Stripe profile late" }
    ]
  }
};
