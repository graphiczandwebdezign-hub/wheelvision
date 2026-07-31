# WheelVision Architecture Package

This directory contains the production architecture specification for the WheelVision SaaS platform. The work is intentionally documentation-first and excludes application code until the architecture is finalized.

## Deliverables

- [Master index](master_index.md)
- [Executive summary](chapter_01_executive_summary.md)
- [Requirements specification](chapter_02_requirements_spec.md)
- [System architecture](chapter_03_system_architecture.md)
- [Domain-driven design](chapter_04_ddd.md)
- [Database architecture](chapter_05_database_architecture.md)
- [Metadata specification](chapter_06_metadata_spec.md)
- [Rendering engine](chapter_07_rendering_engine.md)
- [Asset pipeline](chapter_08_asset_pipeline.md)
- [Vehicle module](chapter_09_vehicle_module.md)
- [Wheel module](chapter_10_wheel_module.md)
- [Tyre module](chapter_11_tyre_module.md)
- [Rendering mathematics](chapter_12_rendering_mathematics.md)
- [State management](chapter_13_state_management.md)
- [API specification](chapter_14_api_spec.md)
- [Authentication](chapter_15_authentication.md)
- [Multi-tenant architecture](chapter_16_multi_tenant.md)
- [Admin portal](chapter_17_admin_portal.md)
- [AI asset pipeline](chapter_18_ai_pipeline.md)
- [Quote system](chapter_19_quote_system.md)
- [Security](chapter_20_security.md)
- [Performance engineering](chapter_21_performance.md)
- [Infrastructure](chapter_22_infrastructure.md)
- [Testing](chapter_23_testing.md)
- [CI/CD](chapter_24_cicd.md)
- [Development standards](chapter_25_dev_standards.md)
- [Future roadmap](chapter_26_roadmap.md)

## Architecture principles

- Zero hardcoding in the renderer.
- Multi-tenant isolation enforced at the database and application layers.
- Metadata-first asset loading for all vehicles.
- Production-ready scalability from day one.
