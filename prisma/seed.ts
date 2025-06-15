import { PrismaClient, PlanType, ToolType } from "@/lib/generated/prisma";

// Use DATABASE_URL directly for seeding to avoid env validation issues
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL,
    },
  },
  log: ["error"],
});

// Seed data
const planFeatures = [
  {
    id: "01912345-6789-7abc-def0-123456789abc",
    name: "agents",
    displayName: "AI Agents",
    description: "Number of AI agents allowed in your account",
    unitLabel: "agents",
  },
  {
    id: "01912345-6789-7abc-def0-123456789abd",
    name: "message_credits",
    displayName: "Message Credits",
    description: "Credits for AI message generation",
    unitLabel: "credits",
  },
  {
    id: "01912345-6789-7abc-def0-123456789abe",
    name: "analytics",
    displayName: "Analytics Access",
    description: "Access to detailed analytics dashboard",
    unitLabel: "access",
  },
  {
    id: "01912345-6789-7abc-def0-123456789abf",
    name: "links",
    displayName: "Website Link Scraping",
    description: "Number of website links that can be scraped/crawled",
    unitLabel: "links",
  },
];

const planLimits = [
  // HOBBY Plan
  {
    id: "01912345-6789-7abc-def0-234567890abc",
    planType: PlanType.HOBBY,
    featureId: "01912345-6789-7abc-def0-123456789abc",
    value: 2,
    isUnlimited: false,
  },
  {
    id: "01912345-6789-7abc-def0-234567890abd",
    planType: PlanType.HOBBY,
    featureId: "01912345-6789-7abc-def0-123456789abd",
    value: 500,
    isUnlimited: false,
  },
  {
    id: "01912345-6789-7abc-def0-234567890abe",
    planType: PlanType.HOBBY,
    featureId: "01912345-6789-7abc-def0-123456789abe",
    value: 0,
    isUnlimited: false,
  },
  {
    id: "01912345-6789-7abc-def0-234567890abf",
    planType: PlanType.HOBBY,
    featureId: "01912345-6789-7abc-def0-123456789abf",
    value: 5,
    isUnlimited: false,
  },
  // STANDARD Plan
  {
    id: "01912345-6789-7abc-def0-234567890ac0",
    planType: PlanType.STANDARD,
    featureId: "01912345-6789-7abc-def0-123456789abc",
    value: 5,
    isUnlimited: false,
  },
  {
    id: "01912345-6789-7abc-def0-234567890ac1",
    planType: PlanType.STANDARD,
    featureId: "01912345-6789-7abc-def0-123456789abd",
    value: 2000,
    isUnlimited: false,
  },
  {
    id: "01912345-6789-7abc-def0-234567890ac2",
    planType: PlanType.STANDARD,
    featureId: "01912345-6789-7abc-def0-123456789abe",
    value: 1,
    isUnlimited: false,
  },
  {
    id: "01912345-6789-7abc-def0-234567890ac3",
    planType: PlanType.STANDARD,
    featureId: "01912345-6789-7abc-def0-123456789abf",
    value: 25,
    isUnlimited: false,
  },
  // PRO Plan
  {
    id: "01912345-6789-7abc-def0-234567890ac4",
    planType: PlanType.PRO,
    featureId: "01912345-6789-7abc-def0-123456789abc",
    value: 15,
    isUnlimited: false,
  },
  {
    id: "01912345-6789-7abc-def0-234567890ac5",
    planType: PlanType.PRO,
    featureId: "01912345-6789-7abc-def0-123456789abd",
    value: 10000,
    isUnlimited: false,
  },
  {
    id: "01912345-6789-7abc-def0-234567890ac6",
    planType: PlanType.PRO,
    featureId: "01912345-6789-7abc-def0-123456789abe",
    value: 1,
    isUnlimited: true,
  },
  {
    id: "01912345-6789-7abc-def0-234567890ac7",
    planType: PlanType.PRO,
    featureId: "01912345-6789-7abc-def0-123456789abf",
    value: 100,
    isUnlimited: false,
  },
];

const addOns = [
  {
    id: "01912345-6789-7abc-def0-345678901abc",
    name: "Additional Agent",
    description: "Add an extra AI agent to your plan",
    externalId: "price_dodo_1234567890",
    featureId: "01912345-6789-7abc-def0-123456789abc",
    unitPrice: 10.0,
    minQuantity: 1,
    maxQuantity: 20,
  },
  {
    id: "01912345-6789-7abc-def0-345678901abd",
    name: "Message Credits Pack - Small",
    description: "1,000 additional message credits",
    externalId: "price_dodo_0987654321",
    featureId: "01912345-6789-7abc-def0-123456789abd",
    unitPrice: 15.0,
    minQuantity: 1,
    maxQuantity: 10,
  },
];

const modelCreditCosts = [
  {
    id: "01912345-6789-7abc-def0-456789012abc",
    modelName: "gpt-4o",
    creditsPerQuery: 5,
    isActive: true,
  },
  {
    id: "01912345-6789-7abc-def0-456789012abd",
    modelName: "gpt-o3-mini",
    creditsPerQuery: 1,
    isActive: true,
  },
  {
    id: "01912345-6789-7abc-def0-456789012abe",
    modelName: "grok-3",
    creditsPerQuery: 5,
    isActive: true,
  },
  {
    id: "01912345-6789-7abc-def0-456789012abf",
    modelName: "grok-3-mini",
    creditsPerQuery: 1,
    isActive: true,
  },
  {
    id: "01912345-6789-7abc-def0-456789012ac0",
    modelName: "claude-3-7-sonnet",
    creditsPerQuery: 10,
    isActive: true,
  },
  {
    id: "01912345-6789-7abc-def0-456789012ac1",
    modelName: "claude-3-5-sonnet",
    creditsPerQuery: 5,
    isActive: true,
  },
  {
    id: "01912345-6789-7abc-def0-456789012ac2",
    modelName: "gemini-2-5-pro",
    creditsPerQuery: 5,
    isActive: true,
  },
  {
    id: "01912345-6789-7abc-def0-456789012ac3",
    modelName: "gemini-2-0-flash",
    creditsPerQuery: 1,
    isActive: true,
  },
  {
    id: "01912345-6789-7abc-def0-456789012ac4",
    modelName: "perplexity-llama-3",
    creditsPerQuery: 3,
    isActive: true,
  },
  {
    id: "01912345-6789-7abc-def0-456789012ac5",
    modelName: "perplexity-mistral-large-2",
    creditsPerQuery: 5,
    isActive: true,
  },
];

const tools = [
  {
    id: "gohighlevel-calendar",
    name: "GoHighLevel Calendar",
    description: "",
    type: ToolType.CALENDAR_BOOKING,
    isActive: true,
    version: "1.0.0",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "",
    type: ToolType.CALENDAR_BOOKING,
    isActive: true,
    version: "1.0.0",
  },
  {
    id: "lead-capture",
    name: "Lead Capture",
    description: "",
    type: ToolType.CONTACT_FORM,
    isActive: true,
    version: "1.0.0",
  },
];

const templateCategories = [
  {
    id: "a54e133d-aac7-462d-bef8-3a9a51660d44",
    name: "Customer Support",
    description: "Templates for customer service and support interactions",
    slug: "customer-support",
  },
  {
    id: "ab8369bb-25e1-4654-8738-0a47b47a470b",
    name: "Sales",
    description: "Templates for sales conversations and lead generation",
    slug: "sales",
  },
  {
    id: "c64f789a-3b2c-4d5e-9f8a-1b2c3d4e5f6g",
    name: "Lead Generation",
    description: "Templates for capturing and qualifying leads",
    slug: "lead-generation",
  },
  {
    id: "d78e912b-4c3d-5e6f-af9b-2c3d4e5f6g7h",
    name: "Appointment Booking",
    description: "Templates for scheduling meetings and appointments",
    slug: "appointment-booking",
  },
  {
    id: "e89f123c-5d4e-6f7g-bf0c-3d4e5f6g7h8i",
    name: "E-commerce",
    description: "Templates for online store customer interactions",
    slug: "e-commerce",
  },
  {
    id: "f90g234d-6e5f-7g8h-cg1d-4e5f6g7h8i9j",
    name: "Healthcare",
    description: "Templates for medical practice and patient communication",
    slug: "healthcare",
  },
  {
    id: "g01h345e-7f6g-8h9i-dh2e-5f6g7h8i9j0k",
    name: "Real Estate",
    description: "Templates for property inquiries and real estate services",
    slug: "real-estate",
  },
  {
    id: "h12i456f-8g7h-9i0j-ei3f-6g7h8i9j0k1l",
    name: "Education",
    description: "Templates for educational institutions and training",
    slug: "education",
  },
  {
    id: "i23j567g-9h8i-0j1k-fj4g-7h8i9j0k1l2m",
    name: "Food & Restaurant",
    description: "Templates for restaurant bookings and food service",
    slug: "food-restaurant",
  },
  {
    id: "j34k678h-0i9j-1k2l-gk5h-8i9j0k1l2m3n",
    name: "Legal Services",
    description: "Templates for law firms and legal consultations",
    slug: "legal-services",
  },
  {
    id: "k45l789i-1j0k-2l3m-hl6i-9j0k1l2m3n4o",
    name: "Financial Services",
    description: "Templates for banks and financial advisors",
    slug: "financial-services",
  },
  {
    id: "l56m890j-2k1l-3m4n-im7j-0k1l2m3n4o5p",
    name: "Travel & Hospitality",
    description: "Templates for travel agencies and hotels",
    slug: "travel-hospitality",
  },
];

const templates = [
  {
    id: "048nnn00-8i37-262m-j892-8508609j5199",
    name: "Restaurant Reservation Assistant",
    description: "Handles restaurant reservations and inquiries",
    content: `You are {{botName}}, a reservation assistant for {{restaurantName}}. You help guests make reservations, answer questions about our menu and services, and provide information about our {{cuisineType}} restaurant.

Your services:
- Making and modifying reservations
- Answering menu questions and dietary restrictions
- Providing information about special events and promotions
- Handling group bookings and private events
- Giving directions and parking information

Restaurant details:
- Cuisine: {{cuisineType}}
- Location: {{location}}
- Hours: {{hours}}
- Party size limit: {{maxPartySize}}

Information to collect for reservations:
- Date and time preference
- Number of guests
- Contact information
- Special requests or dietary restrictions
- Occasion (birthday, anniversary, etc.)

Always be warm and welcoming, representing our restaurant's hospitality.`,
    isPublic: true,
    organizationId: null,
    createdBy: "a228b7ae-2ef0-4290-84f7-9591edb81625",
    placeholderSchema: {
      version: "1.0",
      placeholders: [
        {
          id: "botName",
          name: "Bot Name",
          type: "string",
          required: true,
          description: "Name of the reservation assistant bot",
        },
        {
          id: "restaurantName",
          name: "Restaurant Name",
          type: "string",
          required: true,
          description: "Name of the restaurant",
        },
        {
          id: "cuisineType",
          name: "Cuisine Type",
          type: "string",
          required: true,
          description: "Type of cuisine served",
        },
        {
          id: "location",
          name: "Location",
          type: "string",
          required: true,
          description: "Restaurant address or area",
        },
        {
          id: "hours",
          name: "Operating Hours",
          type: "string",
          required: true,
          description: "Restaurant operating hours",
        },
        {
          id: "maxPartySize",
          name: "Maximum Party Size",
          type: "string",
          required: true,
          description: "Largest party size you can accommodate",
        },
      ],
    },
    usageCount: 0,
    categoryIds: [
      "i23j567g-9h8i-0j1k-fj4g-7h8i9j0k1l2m",
      "d78e912b-4c3d-5e6f-af9b-2c3d4e5f6g7h",
    ], // Food & Restaurant, Appointment Booking
  },
  {
    id: "01234567-89ab-cdef-0123-456789abcdef",
    name: "E-commerce Customer Support",
    description: "Comprehensive customer support for online stores",
    content: `You are {{botName}}, a customer support assistant for {{storeName}}. You help customers with their orders, product inquiries, returns, and general shopping questions.

Your capabilities:
- Order tracking and status updates
- Product information and recommendations
- Return and exchange policies
- Shipping information and delivery times
- Payment and billing inquiries
- Technical support for website issues

Store information:
- Store Name: {{storeName}}
- Website: {{websiteUrl}}
- Customer Service Hours: {{supportHours}}
- Return Policy: {{returnPolicyDays}} days
- Free Shipping Threshold: {{freeShippingThreshold}}

Always be helpful, patient, and solution-oriented. If you cannot resolve an issue, offer to connect the customer with a human representative.`,
    isPublic: true,
    organizationId: null,
    createdBy: "a228b7ae-2ef0-4290-84f7-9591edb81625",
    placeholderSchema: {
      version: "1.0",
      placeholders: [
        {
          id: "botName",
          name: "Bot Name",
          type: "string",
          required: true,
          description: "Name of the customer support bot",
        },
        {
          id: "storeName",
          name: "Store Name",
          type: "string",
          required: true,
          description: "Name of your online store",
        },
        {
          id: "websiteUrl",
          name: "Website URL",
          type: "string",
          required: true,
          description: "Your store's website URL",
        },
        {
          id: "supportHours",
          name: "Support Hours",
          type: "string",
          required: true,
          description: "Customer service operating hours",
        },
        {
          id: "returnPolicyDays",
          name: "Return Policy Days",
          type: "string",
          required: true,
          description: "Number of days for returns",
        },
        {
          id: "freeShippingThreshold",
          name: "Free Shipping Threshold",
          type: "string",
          required: true,
          description: "Minimum order value for free shipping",
        },
      ],
    },
    usageCount: 0,
    categoryIds: [
      "e89f123c-5d4e-6f7g-bf0c-3d4e5f6g7h8i",
      "a54e133d-aac7-462d-bef8-3a9a51660d44",
    ], // E-commerce, Customer Support
  },
  {
    id: "12345678-90ab-cdef-1234-56789abcdef0",
    name: "Real Estate Lead Qualifier",
    description: "Qualifies and nurtures real estate leads",
    content: `You are {{agentName}}, a real estate assistant working with {{realEstateAgency}}. You help potential buyers and sellers by qualifying leads, scheduling appointments, and providing property information.

Your responsibilities:
- Qualify buyer and seller leads
- Schedule property viewings and consultations
- Provide market information and property details
- Collect client preferences and requirements
- Answer questions about the buying/selling process

Service areas: {{serviceAreas}}
Specialties: {{specialties}}
Office location: {{officeLocation}}
Contact: {{agentPhone}}

Lead qualification questions:
- Are you currently looking to buy or sell?
- What's your timeline for making a move?
- Have you been pre-approved for a mortgage? (for buyers)
- What's your budget range?
- What areas are you interested in?
- What type of property are you looking for?

Always be professional, knowledgeable, and helpful while building rapport with potential clients.`,
    isPublic: true,
    organizationId: null,
    createdBy: "a228b7ae-2ef0-4290-84f7-9591edb81625",
    placeholderSchema: {
      version: "1.0",
      placeholders: [
        {
          id: "agentName",
          name: "Agent Name",
          type: "string",
          required: true,
          description: "Name of the real estate agent",
        },
        {
          id: "realEstateAgency",
          name: "Real Estate Agency",
          type: "string",
          required: true,
          description: "Name of the real estate agency",
        },
        {
          id: "serviceAreas",
          name: "Service Areas",
          type: "string",
          required: true,
          description: "Areas where you provide services",
        },
        {
          id: "specialties",
          name: "Specialties",
          type: "string",
          required: true,
          description: "Your specialties (residential, commercial, etc.)",
        },
        {
          id: "officeLocation",
          name: "Office Location",
          type: "string",
          required: true,
          description: "Your office address",
        },
        {
          id: "agentPhone",
          name: "Agent Phone",
          type: "string",
          required: true,
          description: "Your contact phone number",
        },
      ],
    },
    usageCount: 0,
    categoryIds: [
      "g01h345e-7f6g-8h9i-dh2e-5f6g7h8i9j0k",
      "c64f789a-3b2c-4d5e-9f8a-1b2c3d4e5f6g",
      "ab8369bb-25e1-4654-8738-0a47b47a470b",
    ], // Real Estate, Lead Generation, Sales
  },
];

async function seedPlanFeatures() {
  console.log("🌱 Seeding Plan Features...");

  for (const feature of planFeatures) {
    await prisma.planFeature.upsert({
      where: { id: feature.id },
      update: feature,
      create: feature,
    });
  }

  console.log(`✅ Created/updated ${planFeatures.length} plan features`);
}

async function seedPlanLimits() {
  console.log("🌱 Seeding Plan Limits...");

  for (const limit of planLimits) {
    await prisma.planLimit.upsert({
      where: {
        planType_featureId: {
          planType: limit.planType,
          featureId: limit.featureId,
        },
      },
      update: {
        value: limit.value,
        isUnlimited: limit.isUnlimited,
      },
      create: limit,
    });
  }

  console.log(`✅ Created/updated ${planLimits.length} plan limits`);
}

async function seedAddOns() {
  console.log("🌱 Seeding Add-ons...");

  for (const addOn of addOns) {
    await prisma.addOn.upsert({
      where: { id: addOn.id },
      update: addOn,
      create: addOn,
    });
  }

  console.log(`✅ Created/updated ${addOns.length} add-ons`);
}

async function seedModelCreditCosts() {
  console.log("🌱 Seeding Model Credit Costs...");

  for (const cost of modelCreditCosts) {
    await prisma.modelCreditCost.upsert({
      where: { modelName: cost.modelName },
      update: {
        creditsPerQuery: cost.creditsPerQuery,
        isActive: cost.isActive,
      },
      create: cost,
    });
  }

  console.log(
    `✅ Created/updated ${modelCreditCosts.length} model credit costs`
  );
}

async function seedTools() {
  console.log("🌱 Seeding Tools...");

  for (const tool of tools) {
    await prisma.tool.upsert({
      where: { id: tool.id },
      update: {
        name: tool.name,
        description: tool.description,
        type: tool.type,
        isActive: tool.isActive,
        version: tool.version,
      },
      create: tool,
    });
  }

  console.log(`✅ Created/updated ${tools.length} tools`);
}

async function seedTemplateCategories() {
  console.log("🌱 Seeding Template Categories...");

  for (const category of templateCategories) {
    await prisma.templateCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
      },
      create: category,
    });
  }

  console.log(
    `✅ Created/updated ${templateCategories.length} template categories`
  );
}

async function seedTemplates() {
  console.log("🌱 Seeding Templates...");

  for (const template of templates) {
    const { categoryIds, ...templateData } = template;

    await prisma.template.upsert({
      where: { id: template.id },
      update: {
        ...templateData,
        categories: {
          set: categoryIds.map((id) => ({ id })),
        },
      },
      create: {
        ...templateData,
        categories: {
          connect: categoryIds.map((id) => ({ id })),
        },
      },
    });
  }

  console.log(`✅ Created/updated ${templates.length} templates`);
}

async function main() {
  console.log("🚀 Starting database seed...");

  try {
    await seedPlanFeatures();
    await seedPlanLimits();
    await seedAddOns();
    await seedModelCreditCosts();
    await seedTools();
    await seedTemplateCategories();
    await seedTemplates();

    console.log("🎉 Database seed completed successfully!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
