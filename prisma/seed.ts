import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Create tool categories
  console.log("(FAKE) Creating tool categories...");

  // Create tools
  console.log("(FAKE) Creating tools...");
  console.log("(FAKE) Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
