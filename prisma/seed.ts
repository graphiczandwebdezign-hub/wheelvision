import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-tenant' },
    update: {},
    create: {
      name: 'Demo Tenant',
      slug: 'demo-tenant',
    },
  });

  const manufacturer = await prisma.vehicleManufacturer.create({
    data: {
      tenantId: tenant.id,
      name: 'Toyota',
    },
  });

  const model = await prisma.vehicleModel.create({
    data: {
      tenantId: tenant.id,
      vehicleManufacturerId: manufacturer.id,
      name: 'Hilux',
    },
  });

  const variant = await prisma.vehicleVariant.create({
    data: {
      tenantId: tenant.id,
      vehicleModelId: model.id,
      name: 'SR5 Double Cab',
      wheelDiameterMm: 455,
    },
  });

  await prisma.vehicleColour.createMany({
    data: [
      { tenantId: tenant.id, vehicleVariantId: variant.id, name: 'Silver' },
      { tenantId: tenant.id, vehicleVariantId: variant.id, name: 'Black' },
    ],
  });

  const wheelBrand = await prisma.wheelBrand.create({
    data: {
      tenantId: tenant.id,
      name: 'Rota',
    },
  });

  const wheelModel = await prisma.wheelModel.create({
    data: {
      tenantId: tenant.id,
      wheelBrandId: wheelBrand.id,
      name: 'R5',
    },
  });

  await prisma.wheelFinish.createMany({
    data: [
      { tenantId: tenant.id, wheelModelId: wheelModel.id, name: 'Gloss Black' },
      { tenantId: tenant.id, wheelModelId: wheelModel.id, name: 'Matte Bronze' },
    ],
  });

  await prisma.wheelSize.create({
    data: {
      tenantId: tenant.id,
      size: '17x8',
    },
  });

  const tyreBrand = await prisma.tyreBrand.create({
    data: {
      tenantId: tenant.id,
      name: 'Michelin',
    },
  });

  const tyreModel = await prisma.tyreModel.create({
    data: {
      tenantId: tenant.id,
      tyreBrandId: tyreBrand.id,
      name: 'Pilot Sport 4',
    },
  });

  await prisma.tyreProfile.createMany({
    data: [
      { tenantId: tenant.id, tyreModelId: tyreModel.id, profile: '205/55 R16' },
      { tenantId: tenant.id, tyreModelId: tyreModel.id, profile: '225/60 R17' },
    ],
  });

  await prisma.savedConfiguration.create({
    data: {
      tenantId: tenant.id,
      vehicleVariantId: variant.id,
      vehicleModelId: model.id,
      wheelModelId: wheelModel.id,
      tyreModelId: tyreModel.id,
      name: 'Hilux Premium Fitment',
    },
  });

  await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Alex Roberts',
      email: 'alex@example.com',
      phone: '+61123456789',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
