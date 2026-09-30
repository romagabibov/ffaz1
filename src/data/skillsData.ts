/**
 * Comprehensive database of 3,000+ categorized professional skills across
 * Fashion, Design, Engineering, AI/Data, Arts, Business, Marketing, Production, etc.
 */

const RAW_SKILL_DOMAINS: { [category: string]: string[] } = {
 fashion_design: [
 'Fashion Design', 'Haute Couture', 'Prêt-à-Porter Design', 'Bespoke Tailoring', 'Pattern Making',
 'Draping Techniques', 'Garment Construction', 'Textile Science', 'Trend Forecasting', 'Fashion Styling',
 'Fashion Illustration', 'Technical Drawing (Flats)', 'Lookbook Curation', 'Runway Show Production',
 'Backstage Coordination', 'Sustainable Fashion Design', 'Circular Fashion', 'Zero Waste Pattern Making',
 'Upcycling & Remodeling', 'Costume Design', 'Footwear Design', 'Sneaker Design', 'Leather Goods Crafting',
 'Millinery (Hat Design)', 'Knitwear Design', 'Denim Finishing & Washing', 'Embroidery Crafting',
 'Haute Couture Beadwork', 'Silk Screen Printing', 'Digital Textile Printing', 'Batik & Tie-Dye',
 'Fabric Dyeing & Finishing', 'Fabric Sourcing', 'Raw Material Inspection', 'Tech Pack Creation',
 'Bill of Materials (BOM)', 'Grading & Sizing Specs', 'CLO 3D Fashion Design', 'Browzwear (V-Stitcher)',
 'Marvelous Designer', 'Optitex Pattern CAD', 'Gerber AccuMark', 'Lectra Modaris', 'Audaces Apparel CAD',
 'Garment Fitting & Alterations', 'Made-to-Measure Tailoring', 'Bridal Couture', 'Eveningwear Design',
 'Corsetry & Bustier Making', 'Lingerie Design', 'Swimwear Design', 'Activewear & Sportswear Design',
 'Streetwear Design', 'Menswear Tailoring', 'Womenswear Design', 'Childrenswear Design', 'Outerwear Design',
 'Fur & Faux-Fur Crafting', 'Kaftan & Modest Fashion', 'Avant-Garde Fashion', 'Accessory Design',
 'Jewelry Design & Wax Carving', 'Gemology & Stone Setting', 'Handbag Construction', 'Belt & Small Leather Goods',
 'Eyewear Design', 'Watch Design & Horology', 'Fashion Visual Merchandising', 'Window Display Styling',
 'Mannequin Styling', 'Fashion Buying', 'Range Planning', 'Assortment Architecture', 'Apparel Costing',
 'Cut-Make-Trim (CMT) Operations', 'Apparel Quality Assurance (AQL)', 'Garment Lab Dip Approval',
 'Textile Weaving', 'Jacquard Weaving', 'Knitting Machine Operation', 'Spinning & Yarn Selection',
 'Fashion Trend Analysis (WGSN)', 'Color Palette Formulation (Pantone)', 'Mood Board Concepting',
 'Fashion Collection Storytelling', 'Vintage Garment Restoration', 'Wardrobe Consulting', 'Personal Shopping',
 'Celebrity Styling', 'Editorial Fashion Styling', 'Commercial Wardrobe Styling', 'Music Video Styling',
 'Film & TV Costume Styling', 'Red Carpet Styling', 'Fashion Photography Direction', 'Model Posing Direction',
 'Fashion Show Choreography', 'Casting Direction (Fashion)', 'Model Booking & Contracts', 'Fashion PR Strategy',
 'Press Release Writing (Fashion)', 'Sample Closet Management', 'Fashion Showroom Sales', 'Fashion E-Commerce Management'
 ],
 beauty_and_modeling: [
 'Runway High Fashion Walk', 'Commercial Modeling', 'Editorial Posing', 'Lookbook Modeling',
 'Fitting Model (Garments)', 'Hand & Parts Modeling', 'Plus-Size Modeling', 'Petite Modeling',
 'Fitness Modeling', 'Swimwear Modeling', 'Beauty & Cosmetic Modeling', 'Avant-Garde Runway Movement',
 'Backstage Quick Changes', 'Portfolio Development', 'Model Comp Card Design', 'Agency Representation Protocol',
 'Professional Hair Styling', 'Session Hair Styling', 'Runway Hair Concepts', 'Editorial Hair Styling',
 'Wig Making & Styling', 'Hair Extensions Application', 'Color Formulation (Hair)', 'Precision Haircutting',
 'Barbering & Beard Grooming', 'Bridal Hair Design', 'Vintage Hair Wave Styling', 'Afro Hair Texturing',
 'Avant-Garde Makeup', 'Editorial High-Fashion Makeup', 'Runway Makeup Direction', 'SFX Special Effects Makeup',
 'Airbrush Makeup', 'Bridal Makeup Artistry', 'HD TV & Film Makeup', 'Color Correction (Skin Tone)',
 'Contouring & Highlighting', 'Prosthetic Application', 'Face & Body Painting', 'Eyelash Extensions Artistry',
 'Eyebrow Microblading & Lamination', 'Lash Lifting & Tinting', 'Nail Art & Sculpting', 'Gel-X Extensions',
 'Editorial Nail Concepts', 'Skin Analysis & Aesthetic Consultation', 'Spa Treatment Protocols', 'Chemical Peel Protocols'
 ],
 creative_arts_and_media: [
 'Fashion Photography', 'Studio Strobe Lighting', 'Continuous LED Lighting', 'Medium Format Digital Photography',
 '35mm Film Photography', 'Darkroom Printing', 'Location Fashion Photography', 'Editorial Portraiture',
 'Commercial Product Photography', 'Jewelry Macro Photography', 'E-commerce On-Model Photography',
 'Lookbook Photography', 'High-End Beauty Retouching', 'Frequency Separation', 'Dodge and Burn Technique',
 'Color Grading in Photoshop', 'RAW Image Processing (Capture One)', 'Lightroom Presets Development',
 'Color Calibration (Spyder/X-Rite)', 'Fashion Videography', 'Cinematic Runway Filming', 'Fashion Film Directing',
 'Drone Aerial Videography', 'Gimbal Stabilization (Ronin)', 'Camera Operating (RED/ARRI/Sony FX)',
 'Color Grading (DaVinci Resolve)', 'Audio Recording for Video', 'Boom Mic & Lavalier Operation',
 'Video Editing (Premiere Pro)', 'Video Editing (Final Cut Pro)', 'After Effects Motion Graphics',
 'Visual Effects (VFX Compositing)', '3D Camera Tracking', 'Set Design & Construction', 'Prop Sourcing & Fabrication',
 'Lighting Design (Gaffer)', 'Key Grip & Rigging', 'Storyboarding for Commercials', 'Scriptwriting for Fashion Films',
 'Creative Direction', 'Art Direction', 'Brand Aesthetic Supervision', 'Graphic Design for Fashion Brands',
 'Typography & Font Pairing', 'Logo & Identity Design', 'Packaging & Box Design', 'Hangtag & Label Design',
 'Lookbook Layout (InDesign)', 'Magazine Editorial Layout', 'Print Production & Pre-press', 'Foil Stamping & Embossing Specs',
 'Vector Illustration (Illustrator)', 'Digital Painting (Procreate)', '3D Modeling (Blender)', '3D Rendering (Cinema 4D)',
 '3D Garment Simulation', 'Octane Render', 'Redshift 3D Render', 'Unreal Engine 5 Real-Time Production',
 'Virtual Production (LED Volumes)', 'Audio Post-Production', 'Sound Design & Foley', 'Music Composition',
 'Podcast Production & Mastering', 'Voice-Over Recording', 'Commercial Copywriting', 'Editorial Fashion Journalism'
 ],
 software_and_web_development: [
 'JavaScript (ES6+)', 'TypeScript', 'React.js', 'Next.js', 'Vue.js', 'Nuxt.js', 'Angular', 'Svelte',
 'SvelteKit', 'HTML5 & Semantic Markup', 'CSS3 & Modern CSS', 'Tailwind CSS', 'Sass/SCSS', 'PostCSS',
 'Styled Components', 'CSS Modules', 'WebSockets Real-time Data', 'Progressive Web Apps (PWA)', 'Single Page Apps (SPA)',
 'Server-Side Rendering (SSR)', 'Static Site Generation (SSG)', 'Incremental Static Regeneration (ISR)',
 'State Management (Redux Toolkit)', 'State Management (Zustand)', 'State Management (Jotai)', 'State Management (MobX)',
 'React Query (TanStack Query)', 'SWR Data Fetching', 'GraphQL Client (Apollo Client)', 'GraphQL Client (Urql)',
 'Node.js Backend Development', 'Express.js', 'NestJS', 'Fastify', 'Koa.js', 'Hono.js', 'RESTful API Architecture',
 'GraphQL Schema & Resolvers', 'gRPC Protocol Buffers', 'tRPC End-to-End Type Safety', 'WebRTC Peer-to-Peer',
 'Python', 'Django Framework', 'Django REST Framework', 'Flask', 'FastAPI', 'Celery Asynchronous Tasks',
 'Java', 'Spring Boot Framework', 'Spring Cloud Microservices', 'Hibernate ORM', 'Kotlin', 'Kotlin Multiplatform',
 'Android Jetpack Compose', 'Swift', 'SwiftUI', 'iOS App Development', 'Flutter Cross-Platform (Dart)',
 'React Native Mobile Dev', 'Expo Framework', 'C#', '.NET Core', 'ASP.NET Web API', 'Entity Framework Core',
 'Go (Golang)', 'Gin Framework (Go)', 'Fiber (Go)', 'Rust', 'Actix Web (Rust)', 'Axum (Rust)', 'Tokio Async Runtime',
 'PHP', 'Laravel Framework', 'Symfony', 'WordPress Custom Theme Dev', 'WordPress Plugin Dev', 'Shopify Liquid Templating',
 'Shopify Headless Commerce', 'WooCommerce Customization', 'Magento / Adobe Commerce', 'BigCommerce Development',
 'WebAssembly (WASM)', 'Three.js 3D Web Graphics', 'WebGL Shaders (GLSL)', 'Babylon.js 3D Engine',
 'Canvas 2D API', 'SVG Animation (GSAP)', 'Framer Motion Animations', 'D3.js Data Visualizations',
 'Micro-Frontends Architecture', 'Monorepo Tooling (Turborepo)', 'Monorepo Tooling (Nx)', 'Webpack Configuration',
 'Vite Build Tool', 'Rollup.js Bundler', 'esbuild', 'Babel Compiler', 'npm/pnpm/yarn Package Management',
 'Jest Unit Testing', 'Vitest', 'React Testing Library', 'Cypress E2E Testing', 'Playwright Automation',
 'Puppeteer Web Scraping', 'Selenium WebDriver', 'Storybook UI Component Docs', 'Lighthouse Performance Optimization'
 ],
 databases_and_backend_systems: [
 'PostgreSQL Database Admin', 'MySQL Optimization', 'SQLite', 'MariaDB', 'Microsoft SQL Server', 'Oracle Database',
 'Database Normalization (3NF)', 'Complex SQL Queries & Joins', 'Database Indexing & B-Trees', 'Query Execution Plan Analysis',
 'Database Stored Procedures & Triggers', 'Connection Pooling (PgBouncer)', 'Database Partitioning & Sharding',
 'MongoDB NoSQL Architecture', 'MongoDB Aggregation Pipeline', 'Apache Cassandra', 'Couchbase', 'DynamoDB (AWS)',
 'Firestore (Firebase Database)', 'Firebase Realtime Database', 'Firebase Authentication', 'Firebase Cloud Functions',
 'Firebase Security Rules', 'Supabase Backend Platform', 'Appwrite Open Source Backend', 'Redis In-Memory Caching',
 'Redis Pub/Sub', 'Redis Streams', 'Memcached', 'Elasticsearch Cluster Admin', 'Elasticsearch Full-Text Querying',
 'OpenSearch', 'Apache Solr', 'Neo4j Graph Database', 'Cypher Query Language', 'ArangoDB Multi-Model',
 'ClickHouse Columnar Database', 'Apache Pinot', 'Apache Druid', 'DuckDB Fast Analytics', 'Prisma ORM',
 'Drizzle ORM', 'TypeORM', 'Mongoose ODM', 'Sequelize ORM', 'SQLAlchemy (Python)', 'ActiveRecord (Ruby)',
 'Database Backup & Disaster Recovery', 'Database Replication (Primary-Replica)', 'Database High Availability (HA)',
 'Database Migration Scripting', 'Flyway Database Migrations', 'Liquibase Change Tracking', 'ACID Compliance Management',
 'Distributed Transactions (2PC/Saga)', 'Event Sourcing Patterns', 'CQRS Architecture Pattern'
 ],
 cloud_devops_and_infrastructure: [
 'AWS Cloud Architecture', 'AWS EC2 Virtual Servers', 'AWS S3 Object Storage', 'AWS Lambda Serverless',
 'AWS ECS Container Service', 'AWS EKS Managed Kubernetes', 'AWS CloudFront CDN', 'AWS Route 53 DNS',
 'AWS IAM Security Policies', 'AWS RDS Managed Relational DB', 'AWS DynamoDB NoSQL', 'AWS SQS Message Queues',
 'AWS SNS Notification Service', 'AWS CloudWatch Monitoring', 'AWS VPC Virtual Private Cloud', 'AWS CloudFormation',
 'Google Cloud Platform (GCP)', 'Google Cloud Run Serverless', 'Google Kubernetes Engine (GKE)', 'Google Compute Engine',
 'Google Cloud Storage', 'Google BigQuery Data Warehouse', 'Google Cloud Functions', 'Google Cloud Pub/Sub',
 'Google Cloud IAM', 'Google Cloud VPC Network', 'Microsoft Azure Architecture', 'Azure Virtual Machines',
 'Azure App Services', 'Azure Kubernetes Service (AKS)', 'Azure Blob Storage', 'Azure Cosmos DB', 'Azure Functions',
 'Azure DevOps Pipelines', 'Docker Containerization', 'Dockerfile Multi-stage Optimization', 'Docker Compose Orchestration',
 'Kubernetes Cluster Architecture', 'Kubernetes Pods & Deployments', 'Kubernetes Services & Ingress', 'Kubernetes Helm Charts',
 'Kubernetes ConfigMaps & Secrets', 'Kubernetes Horizontal Pod Autoscaling', 'K9s Terminal UI', 'Terraform Infrastructure as Code',
 'Terraform Cloud / Atlantis', 'Ansible Configuration Management', 'Packer Machine Images', 'Pulumi Modern IaC',
 'CI/CD Pipeline Design', 'GitHub Actions Workflows', 'GitLab CI/CD Pipelines', 'Jenkins Declarative Pipelines',
 'ArgoCD GitOps Deployment', 'FluxCD GitOps', 'Linux Server Administration (Ubuntu/Debian)', 'Linux Server Administration (RHEL/CentOS/Rocky)',
 'Bash Shell Scripting & Automation', 'SSH Key Management & Bastion Hosts', 'Nginx Web Server & Reverse Proxy',
 'Apache HTTP Server', 'Caddy Web Server', 'HAProxy Load Balancing', 'Traefik Cloud Native Proxy',
 'Cloudflare CDN & Edge Routing', 'Cloudflare Workers (V8 Edge)', 'Cloudflare DDoS Mitigation', 'Fastly VCL Edge Compute',
 'Prometheus Metrics Scraping', 'Grafana Dashboard Creation', 'Datadog APM & Infrastructure', 'New Relic Performance Monitoring',
 'ELK Stack (Elastic, Logstash, Kibana)', 'OpenTelemetry Tracing (OTel)', 'Sentry Error Tracking', 'PagerDuty On-Call Configuration',
 'Chaos Engineering (Gremlin/Chaos Mesh)', 'Site Reliability Engineering (SRE)', 'High Availability Architecture (99.99%)',
 'Disaster Recovery Planning (RTO/RPO)', 'Cost Optimization (FinOps)', 'Green Cloud Architecture'
 ],
 ai_machine_learning_and_data_science: [
 'Python for Data Science', 'NumPy High-Performance Computing', 'Pandas Data Wrangling', 'SciPy Scientific Computing',
 'Scikit-Learn Machine Learning', 'Supervised Machine Learning', 'Unsupervised Machine Learning', 'Random Forest Classifiers',
 'Gradient Boosting (XGBoost)', 'Gradient Boosting (LightGBM)', 'Gradient Boosting (CatBoost)', 'Support Vector Machines (SVM)',
 'Linear & Logistic Regression', 'K-Means Clustering', 'Hierarchical Clustering', 'Principal Component Analysis (PCA)',
 'Deep Learning Architectures', 'TensorFlow 2.x Ecosystem', 'PyTorch Deep Learning', 'Keras High-Level API',
 'JAX Numerical Computing', 'Convolutional Neural Networks (CNN)', 'Recurrent Neural Networks (RNN/LSTM)',
 'Transformers Architecture', 'Vision Transformers (ViT)', 'Self-Attention Mechanisms', 'Natural Language Processing (NLP)',
 'NLTK Text Processing', 'spaCy Industrial NLP', 'Hugging Face Transformers Library', 'Hugging Face Datasets',
 'Hugging Face Diffusers', 'Tokenization (BPE/WordPiece)', 'Named Entity Recognition (NER)', 'Part-of-Speech (POS) Tagging',
 'Sentiment Analysis Models', 'Text Summarization Models', 'Machine Translation Models', 'Large Language Models (LLMs)',
 'Google Gemini API Integration', 'OpenAI GPT-4 Integration', 'Anthropic Claude API', 'Mistral AI Integration',
 'Llama 3 Open Source Deployment', 'Prompt Engineering & System Prompts', 'Few-Shot & Chain-of-Thought Prompting',
 'LLM Fine-Tuning with LoRA', 'Quantization (bitsandbytes / GGUF)', 'Retrieval-Augmented Generation (RAG)',
 'LangChain AI Framework', 'LlamaIndex Knowledge Framework', 'Semantic Kernel (Microsoft)', 'Vector Database Admin (Pinecone)',
 'Vector Database Admin (ChromaDB)', 'Vector Database Admin (Weaviate)', 'Vector Database Admin (Milvus)',
 'Vector Database Admin (Qdrant)', 'Embeddings Generation (text-embedding-3)', 'Cosine Similarity Search',
 'Computer Vision (OpenCV)', 'Object Detection (YOLOv8/v9/v10)', 'Semantic Image Segmentation', 'Image Classification',
 'Face Recognition & Verification', 'Optical Character Recognition (OCR)', 'Generative Adversarial Networks (GANs)',
 'Diffusion Models & Stable Diffusion', 'ComfyUI Node-Based AI Workflow', 'ControlNet Guided Generation',
 'LoRA Training for Images', 'Inpainting & Outpainting', 'Audio Processing with Librosa', 'Speech-to-Text (Whisper AI)',
 'Text-to-Speech (ElevenLabs/Bark)', 'Voice Cloning & Synthesis', 'Music Generation (AudioCraft/MusicGen)',
 'Reinforcement Learning (RL)', 'Deep Q-Learning (DQN)', 'Proximal Policy Optimization (PPO)', 'Reinforcement Learning from Human Feedback (RLHF)',
 'Direct Preference Optimization (DPO)', 'MLOps Pipeline Engineering', 'MLflow Experiment Tracking', 'Weights & Biases (W&B)',
 'Kubeflow Pipelines', 'DVC Data Version Control', 'Triton Inference Server', 'vLLM Fast LLM Serving',
 'Ollama Local LLM Deployment', 'Model Benchmarking & Evaluation', 'AI Safety & Red Teaming', 'AI Guardrails & Moderation',
 'Apache Spark Big Data Processing', 'PySpark Distributed Computing', 'Apache Flink Stream Processing', 'Apache Kafka Event Streams',
 'Kafka Connect & Schema Registry', 'RabbitMQ Message Broker', 'Apache Airflow Workflow Orchestration', 'Prefect Data Pipelines',
 'dbt (data build tool) Modeling', 'Snowflake Cloud Data Warehouse', 'Databricks Lakehouse Platform', 'Delta Lake Storage Format',
 'Apache Iceberg Open Table Format', 'Tableau Business Intelligence', 'Power BI Dashboard Creation', 'Looker Data Studio Reporting',
 'A/B Testing & Statistical Hypothesis Testing', 'Cohort Analysis & Retention Modeling', 'Customer Lifetime Value (CLV) Modeling',
 'Churn Prediction Modeling', 'Time Series Forecasting (Prophet/ARIMA)', 'Market Basket Analysis & Recommenders'
 ],
 cybersecurity_and_compliance: [
 'Information Security (InfoSec)', 'Cyber Threat Intelligence', 'Penetration Testing (Ethical Hacking)', 'Web App Penetration Testing',
 'Network Penetration Testing', 'Wireless Security Auditing', 'OWASP Top 10 Vulnerability Remediation', 'Burp Suite Professional',
 'Metasploit Framework', 'Nmap Network Scanning', 'Wireshark Packet Analysis', 'Kali Linux Toolset', 'Zero Trust Network Architecture',
 'Public Key Infrastructure (PKI)', 'SSL/TLS Certificate Lifecycle', 'Cryptography (AES, RSA, ECC, Post-Quantum)', 'Hash Functions (SHA-256, bcrypt, argon2)',
 'Identity & Access Management (IAM)', 'OAuth 2.0 Authorization Protocol', 'OpenID Connect (OIDC) Authentication', 'SAML 2.0 Enterprise SSO',
 'Multi-Factor Authentication (MFA/2FA)', 'Passkeys & WebAuthn / FIDO2', 'Role-Based Access Control (RBAC)', 'Attribute-Based Access Control (ABAC)',
 'SOC 2 Type II Compliance Auditing', 'ISO/IEC 27001 ISMS Implementation', 'GDPR Data Privacy Compliance', 'CCPA/CPRA Privacy Compliance',
 'PCI-DSS Payment Security Standard', 'HIPAA Healthcare Security Rule', 'Vulnerability Assessment (Nessus/Qualys)', 'Static Application Security Testing (SAST)',
 'Dynamic Application Security Testing (DAST)', 'Software Composition Analysis (SCA)', 'Dependabot / Snyk Vulnerability Management',
 'Security Information & Event Management (SIEM)', 'Splunk Security Enterprise', 'Elastic Security SIEM', 'Incident Response & Forensics',
 'Digital Forensics & Evidence Handling', 'Malware Reverse Engineering (Ghidra/IDA Pro)', 'Endpoint Detection & Response (EDR)',
 'CrowdStrike Falcon Administration', 'Cloud Security Posture Management (CSPM)', 'WAF Web Application Firewall Config', 'DDoS Protection Engineering',
 'API Security Best Practices', 'Container Security (Trivy/Clair/Falco)', 'Secrets Management (HashiCorp Vault)', 'AWS Secrets Manager',
 'Social Engineering Awareness Training', 'Phishing Simulation Campaigns', 'Security Architecture Review', 'Threat Modeling (STRIDE/PASTA)'
 ],
 product_and_project_management: [
 'Product Management Strategy', 'Product Vision & North Star Metric', 'Product Roadmap Architecture', 'Feature Prioritization (RICE/MoSCoW/Kano)',
 'User Story Mapping', 'Product Requirements Document (PRD)', 'Competitive Product Analysis', 'Market Opportunity Assessment',
 'Minimum Viable Product (MVP) Scoping', 'Continuous Discovery Habits', 'Customer Interviewing Techniques', 'User Persona Development',
 'Jobs-to-be-Done (JTBD) Framework', 'Product-Led Growth (PLG) Strategy', 'Freemium & Tiered Pricing Strategy', 'Onboarding Funnel Optimization',
 'Feature Adoption Analytics', 'Product Analytics (Mixpanel/Amplitude)', 'PostHog Product Analytics', 'Heap Analytics',
 'A/B Experimentation Design', 'Conversion Funnel Analysis', 'Agile Methodology Leadership', 'Scrum Master Certification (CSM/PSM)',
 'Kanban Workflow Optimization', 'Sprint Planning & Capacity Estimation', 'Daily Standup Facilitation', 'Sprint Review & Demo Moderation',
 'Sprint Retrospective Facilitation', 'Backlog Grooming & Story Pointing', 'Jira Administration & Workflows', 'Linear Issue Tracking System',
 'Asana Project Management', 'Monday.com Workflow Automation', 'ClickUp Workspace Setup', 'Notion Team Workspace Architecture',
 'Trello Board Automation', 'Confluence Documentation Systems', 'Basecamp Collaboration', 'Risk Management & Mitigation Plans',
 'Stakeholder Communication & Buy-in', 'Executive Presentation Deck Building', 'Cross-Functional Team Leadership', 'Vendor & Contractor Management',
 'Procurement & RFP Process', 'Project Budgeting & Resource Allocation', 'Critical Path Method (CPM)', 'Gantt Chart Scheduling',
 'Change Management (ADKAR Framework)', 'Lean Six Sigma Green Belt', 'Process Mapping & Optimization (BPMN)', 'Objectives & Key Results (OKRs)',
 'Key Performance Indicators (KPIs)', 'Value Stream Mapping', 'Post-Mortem & Root Cause Analysis (5 Whys)'
 ],
 digital_marketing_and_growth: [
 'Search Engine Optimization (SEO)', 'Technical SEO Auditing', 'On-Page SEO Optimization', 'Off-Page SEO & Link Building',
 'Keyword Research (Ahrefs/SEMrush)', 'Search Intent Mapping', 'Core Web Vitals Optimization', 'Structured Data & Schema.org Markup',
 'Local SEO & Google Business Profile', 'International SEO (hreflang)', 'E-Commerce SEO for Shopify & Stores', 'Content Marketing Strategy',
 'SEO Content Brief Creation', 'Editorial Calendar Planning', 'Pillar & Cluster Content Modeling', 'Guest Blogging & Digital PR Outreach',
 'Search Engine Marketing (SEM)', 'Google Ads Search Campaigns', 'Google Ads Display Network', 'Google Ads Performance Max (PMax)',
 'Google Shopping Ads & Merchant Center', 'YouTube Video Advertising', 'Negative Keyword Sculpting', 'Google Ads Quality Score Optimization',
 'Meta Ads (Facebook & Instagram Ads Manager)', 'Meta Pixel & Conversions API (CAPI)', 'Meta Custom & Lookalike Audiences',
 'Meta Creative Testing Frameworks', 'TikTok Ads Manager Campaigns', 'TikTok Spark Ads & Creator Marketplace', 'LinkedIn Sponsored Content B2B',
 'LinkedIn InMail & Lead Gen Forms', 'Pinterest Advertising for Fashion', 'Twitter / X Ads Campaigns', 'Snapchat Ads for Gen-Z',
 'Influencer Marketing Strategy', 'Influencer Discovery & Outreach', 'Influencer Contract Negotiation', 'Influencer Campaign ROI Tracking',
 'Affiliate Marketing Program Setup', 'Impact.com / ShareASale Management', 'Email Marketing Strategy', 'Klaviyo E-Commerce Email Flows',
 'Mailchimp Campaign Management', 'HubSpot Marketing Hub Automation', 'ActiveCampaign Automation', 'Drip Campaigns & Lifecycle Emails',
 'Welcome Series Email Flows', 'Abandoned Cart Email Sequences', 'Post-Purchase Upsell Sequences', 'Win-Back Customer Campaigns',
 'Email Deliverability & SPF/DKIM/DMARC', 'SMS Marketing (Attentive/Postscript)', 'Push Notification Marketing (OneSignal)',
 'Conversion Rate Optimization (CRO)', 'Hotjar / Clarity Heatmap Analysis', 'Landing Page Design (Unbounce/Instapage)',
 'A/B Testing Copy & Headlines', 'Checkout Flow Friction Reduction', 'Growth Hacking & Viral Loops', 'Referral Program Architecture',
 'Social Media Organic Growth', 'Instagram Reels Strategy & Production', 'TikTok Organic Video Strategy', 'YouTube Channel Growth & SEO',
 'Pinterest Visual Search Optimization', 'Community Building (Discord/Telegram)', 'Brand Storytelling & Brand Voice', 'Public Relations & Press Outreach',
 'Press Kit & Media Kit Creation', 'Crisis PR Management & Response', 'Event Marketing & Live Activations', 'Pop-Up Shop Marketing',
 'Sponsorship Pitching & Execution', 'Trade Show Booth Marketing', 'Webinar Hosting & Production', 'Podcast Guest Pitching'
 ],
 business_finance_and_sales: [
 'Financial Modeling (DCF/LBO/M&A)', 'Corporate Financial Analysis', 'Budgeting & Variance Analysis', 'Cash Flow Forecasting & Management',
 'P&L Statement Preparation & Review', 'Balance Sheet Reconciliations', 'Working Capital Optimization', 'Venture Capital Fundraising (Series A/B)',
 'Angel Investor Pitch Decks', 'Cap Table Management (Carta)', 'SAFE & Convertible Note Structuring', 'Due Diligence Preparation (Data Rooms)',
 'Mergers & Acquisitions (M&A) Advisory', 'Post-Merger Integration Planning', 'Business Valuation Methodologies', 'Private Equity Portfolio Operations',
 'GAAP Accounting Standards', 'IFRS International Financial Standards', 'QuickBooks Online Accounting', 'Xero Cloud Accounting',
 'Tax Strategy & Deductions Planning', 'Corporate Tax Filing Compliance', 'Sales Tax & VAT Cross-Border Rules', 'Payroll Administration (Gusto/Deel)',
 'Accounts Receivable & Collections', 'Accounts Payable & Vendor Invoicing', 'Cost Accounting & Unit Economics', 'Pricing Strategy & Elasticity Modeling',
 'B2B Enterprise Sales', 'B2B Solution Selling Methodologies', 'SPIN Selling Framework', 'MEDDIC / MEDDPICC Qualification',
 'Challenger Sale Framework', 'Cold Email & LinkedIn Outreach', 'Sales Pipeline Management', 'Salesforce CRM Administration',
 'HubSpot Sales Hub Configuration', 'Pipedrive CRM Workflows', 'Sales Forecasting & Quota Planning', 'Contract Negotiation & Closing',
 'Master Services Agreement (MSA) Terms', 'Statement of Work (SOW) Scoping', 'Account-Based Marketing & Sales (ABM)', 'Customer Success Management (CSM)',
 'Net Retention Rate (NRR) Optimization', 'Customer Onboarding Workflows', 'Customer Churn Prevention Programs', 'Quarterly Business Reviews (QBR)',
 'Customer Support Operations (Zendesk)', 'Intercom Live Chat Setup', 'NPS & CSAT Survey Management', 'Supply Chain Optimization',
 'Global Logistics & Freight Forwarding', 'Customs Clearance & Tariffs Protocol', 'Inventory Control (EOQ/JIT)', 'Warehouse Management Systems (WMS)',
 'Third-Party Logistics (3PL) Management', 'Procurement & Vendor Quality Control', 'Contract Law & NDA Drafting', 'Intellectual Property (IP) Protection',
 'Trademark Search & Filing', 'Copyright Registration & Enforcement', 'Patent Landscape Analysis', 'HR Talent Acquisition & Headhunting',
 'Technical Recruiting for Engineers', 'Executive Search & Placement', 'Behavioral Interviewing (STAR Method)', 'Compensation & Total Rewards Benchmarking',
 'Employee Stock Option Plans (ESOP)', 'Diversity, Equity & Inclusion (DEI)', 'HRIS Management (BambooHR/Rippling)', 'Employee Performance Reviews (360°)'
 ]
};

function generateComprehensiveSkillsList(): string[] {
 const skillsSet = new Set<string>();

 // 1. Add all core domain skills
 Object.values(RAW_SKILL_DOMAINS).forEach(domainSkills => {
 domainSkills.forEach(s => skillsSet.add(s.trim()));
 });

 // 2. Add technical and creative tools with multi-action specializations
 const toolsAndFrameworks = [
 'Adobe Photoshop', 'Adobe Illustrator', 'Adobe InDesign', 'Adobe After Effects', 'Adobe Premiere Pro',
 'Adobe Lightroom', 'Adobe XD', 'Adobe Audition', 'Adobe Substance 3D', 'Adobe Fresco', 'Adobe Bridge',
 'Figma', 'FigJam', 'Sketch', 'InVision', 'Axure RP', 'Balsamiq', 'Miro', 'Mural', 'Whimsical',
 'Blender 3D', 'Cinema 4D', 'Autodesk Maya', 'Autodesk 3ds Max', 'ZBrush', 'Houdini', 'Marvelous Designer',
 'CLO 3D', 'Browzwear', 'Optitex', 'Gerber AccuMark', 'Lectra', 'Rhino 3D', 'KeyShot', 'Substance Painter',
 'Unreal Engine 5', 'Unity 3D', 'Godot Engine', 'DaVinci Resolve', 'Final Cut Pro', 'Logic Pro X', 'Ableton Live',
 'Pro Tools', 'FL Studio', 'Cubase', 'Capture One Pro', 'Helicon Focus', 'Wacom Tablet Workflow',
 'React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js', 'Remix', 'Gatsby', 'Astro', 'Express.js',
 'NestJS', 'Fastify', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Laravel', 'Symfony', 'Ruby on Rails',
 'ASP.NET Core', 'Gin', 'Echo', 'Fiber', 'Actix', 'Axum', 'Flutter', 'React Native', 'SwiftUI', 'Jetpack Compose',
 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra', 'DynamoDB', 'Firestore', 'Supabase',
 'Snowflake', 'BigQuery', 'Databricks', 'Apache Spark', 'Apache Kafka', 'RabbitMQ', 'Apache Airflow', 'dbt',
 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'AWS', 'Google Cloud (GCP)', 'Microsoft Azure', 'Cloudflare',
 'PyTorch', 'TensorFlow', 'Scikit-Learn', 'OpenCV', 'Hugging Face', 'LangChain', 'LlamaIndex', 'vLLM', 'Ollama',
 'Jira', 'Linear', 'Asana', 'Notion', 'Monday.com', 'ClickUp', 'Trello', 'Basecamp', 'Confluence',
 'Salesforce', 'HubSpot', 'Klaviyo', 'Mailchimp', 'Google Ads', 'Meta Ads Manager', 'TikTok Ads Manager',
 'Google Analytics 4 (GA4)', 'Mixpanel', 'Amplitude', 'PostHog', 'Hotjar', 'SEMrush', 'Ahrefs', 'Stripe API'
 ];

 const skillActions = [
 'Architecture', 'Development', 'Engineering', 'Administration', 'Design', 'Strategy', 'Optimization',
 'Consulting', 'Integration', 'Automation', 'Analysis', 'Management', 'Auditing', 'Troubleshooting',
 'Mastery', 'Implementation', 'Workflow Optimization', 'Security', 'Testing & QA', 'Deployment'
 ];

 for (const tool of toolsAndFrameworks) {
 skillsSet.add(tool);
 for (const action of skillActions) {
 skillsSet.add(`${tool} ${action}`);
 }
 }

 // 3. Add fashion materials, couture methods and apparel fabrication
 const fashionMaterialsAndMethods = [
 'Silk Chiffon', 'Silk Charmeuse', 'Silk Organza', 'Mulberry Silk', 'Cashmere Wool', 'Merino Wool', 'Alpaca Wool',
 'Egyptian Cotton', 'Pima Cotton', 'Organic Hemp', 'Linen Blend', 'Tencel Lyocell', 'Cupro Rayon', 'Modal Jersey',
 'Jacquard Brocade', 'French Chantilly Lace', 'Guipure Lace', 'Tulle Illusion', 'Velvet Devoré', 'Japanese Selvedge Denim',
 'Full-Grain Leather', 'Nappa Leather', 'Suede & Nubuck', 'Exotic Embossed Leather', 'Recycled Ocean Polymer',
 'Bio-based Vegan Leather', 'Gold Leaf Foiling', 'Silver Thread Embroidery', 'Swarovski Crystal Application',
 'Tambour Beading', 'French Knot Hand Embroidery', 'Shadow Work Embroidery', 'Cutwork Lace (Richelieu)',
 'Accordion Pleating', 'Fortuny Pleating', 'Box Pleating', 'Smocking & Shirring', 'Bias Cut Draping',
 'Couture Corset Boning', 'Underwire Cup Molding', 'Tailored Canvas Interfacing', 'Pad Stitching Lapels',
 'Hand Pick Stitching', 'Bound Buttonholes', 'French Seaming', 'Hong Kong Seam Binding', 'Rolled Baby Hemming',
 'Mitered Corner Finishing', 'Flatlock Seaming for Activewear', 'Waterproof Heat Sealing', 'Ultrasonic Fabric Welding',
 'Bespoke Suiting', 'Couture Embroidery', 'Silk Weaving', 'Cashmere Processing', 'Sustainable Dyeing',
 'Pattern Digitization', 'Garment 3D Fit', 'Runway Lighting', 'Fashion Film Scoring', 'Virtual Fashion Show',
 'Fashion Metaverse Asset', 'NFT Fashion Wearable', 'Digital Showroom Design', 'Fabric Lifecycle Assessment',
 'Circular Textile Recycling', 'Fair Trade Sourcing', 'Ethical Garment Manufacturing', 'Fashion Merchandising Math',
 'Open-to-Buy (OTB) Planning', 'Markdown Optimization', 'Stock Keeping Unit (SKU) Rationalization',
 'Visual Display Architecture', 'Mannequin Vignette Styling', 'Flagship Store Experience Design',
 'Fashion Influencer Gifting', 'Brand Ambassador Management', 'Backstage VIP Hospitality', 'Runway Lineup Coordination',
 'Front Row Seating Protocol', 'Fashion Week Press Accreditation', 'Sample Trafficking Protocol',
 'Fabric Swatch Library Management', 'Drape Grading', 'Bustier Underwire Fitting', 'Corset Steel Boning',
 'Tulle Layering Technique', 'Leather Skiving', 'Edge Painting for Leather', 'Saddle Stitching by Hand',
 'Glove Making Craft', 'Felt Hat Blocking', 'Pleating Techniques (Accordion/Sunburst)', 'Smocking Stitch',
 'Crochet Couture', 'Tapestry Weaving', 'Indigo Vat Dyeing', 'Screen Print Color Separation',
 'Sublimation Print Heat Press', 'Direct-to-Garment (DTG) Printing', 'Direct-to-Film (DTF) Printing',
 'Embroidery Digitizing (Wilcom)', 'Apparel Barcode & RFID Tagging', 'Garment Steam Finishing',
 'Industrial Sewing Machine Maintenance', 'Overlock / Serger Operation', 'Coverstitch Machine Operation',
 'Blind Hemming Machine Operation', 'Flatlock Stitch Operation', 'Buttonhole Machine Setup'
 ];

 const fashionActions = [
 'Crafting', 'Sourcing', 'Cutting & Assembly', 'Pattern Engineering', 'Quality Inspection',
 'Custom Tailoring', 'Couture Finishing', 'Dyeing & Treatment', 'Design & Styling', 'Production Management'
 ];

 for (const mat of fashionMaterialsAndMethods) {
 skillsSet.add(mat);
 for (const act of fashionActions) {
 skillsSet.add(`${mat} ${act}`);
 }
 }

 // 4. Generate domain sub-specialties & technical combinations until over 3,200+
 const domainPrefixes = [
 'Advanced', 'Applied', 'Strategic', 'Enterprise', 'Global', 'Sustainable', 'Digital',
 'High-End', 'Commercial', 'Creative', 'Executive', 'Technical', 'Automated', 'International',
 'Modern', 'Professional', 'Cross-Disciplinary', 'Experimental', 'Bespoke', 'Full-Lifecycle'
 ];

 const baseList = Array.from(skillsSet);
 for (const skill of baseList) {
 if (skillsSet.size >= 3400) break;
 for (const prefix of domainPrefixes) {
 if (skillsSet.size >= 3400) break;
 if (!skill.startsWith(prefix) && skill.length < 32) {
 skillsSet.add(`${prefix} ${skill}`);
 }
 }
 }

 return Array.from(skillsSet).sort((a, b) => a.localeCompare(b));
}

export const ALL_PREDEFINED_SKILLS: string[] = generateComprehensiveSkillsList();

/**
 * Fast search helper that filters skills matching query with prioritization:
 * 1. Exact match
 * 2. Starts-with match
 * 3. Word-boundary match
 * 4. Substring match
 */
export function searchSkills(query: string, currentSkills: string[] = [], limit: number = 60): string[] {
 const currentSet = new Set(currentSkills);
 if (!query || !query.trim()) {
 return ALL_PREDEFINED_SKILLS.filter(s => !currentSet.has(s)).slice(0, limit);
 }

 const q = query.trim().toLowerCase();
 const exact: string[] = [];
 const startsWith: string[] = [];
 const containsWord: string[] = [];
 const containsSub: string[] = [];

 for (const skill of ALL_PREDEFINED_SKILLS) {
 if (currentSet.has(skill)) continue;
 const lower = skill.toLowerCase();

 if (lower === q) {
 exact.push(skill);
 } else if (lower.startsWith(q)) {
 startsWith.push(skill);
 } else if (lower.includes(` ${q}`) || lower.includes(`(${q}`)) {
 containsWord.push(skill);
 } else if (lower.includes(q)) {
 containsSub.push(skill);
 }

 if (exact.length + startsWith.length + containsWord.length + containsSub.length >= limit * 2) {
 break;
 }
 }

 const combined = [...exact, ...startsWith, ...containsWord, ...containsSub];
 return combined.slice(0, limit);
}
