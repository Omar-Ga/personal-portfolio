export interface ArchiveProjectEntry {
  id: string;
  number: string;
  slug: string;
  image: string;
  gallery: string[];
}

export const ARCHIVE_ENTRIES: ArchiveProjectEntry[] = [
  // Column 1 (Left Track: 10 Projects)
  {
    id: 'p1',
    number: '01',
    slug: 'skycourt-wms',
    image: '/images/skycourt-wms/01_operations_dashboard.webp',
    gallery: [
      '/images/skycourt-wms/01_operations_dashboard.webp',
      '/images/skycourt-wms/02_two_operator_dispatch.webp',
      '/images/skycourt-wms/03_immutable_movement_log.webp',
      '/images/skycourt-wms/04_inventory_reconciliation.webp',
      '/images/skycourt-wms/05_purchase_order_lifecycle.webp',
      '/images/skycourt-wms/06_dispatch_ticket_print.webp',
      '/images/skycourt-wms/07_supervisor_requisitions_arabic.webp'
    ]
  },
  {
    id: 'p2',
    number: '02',
    slug: 'queen-hive',
    image: '/images/queen-hive/01_workflow_canvas.webp',
    gallery: [
      '/images/queen-hive/01_workflow_canvas.webp',
      '/images/queen-hive/02_live_run_transcript.webp',
      '/images/queen-hive/03_work_order.webp',
      '/images/queen-hive/04_worker_adapters.webp',
      '/images/queen-hive/05_repair_loop.webp',
      '/images/queen-hive/06_workflow_catalog.webp',
      '/images/queen-hive/07_benchmarks_costs.webp'
    ]
  },
  {
    id: 'p3',
    number: '03',
    slug: 'kafaa-ats',
    image: '/images/kafaa-ats/01_recruitment_home_dashboard.webp',
    gallery: [
      '/images/kafaa-ats/01_recruitment_home_dashboard.webp',
      '/images/kafaa-ats/02_recruitment_campaigns.webp',
      '/images/kafaa-ats/03_hiring_pipeline_kanban.webp',
      '/images/kafaa-ats/04_ai_cv_parsing_hub.webp',
      '/images/kafaa-ats/05_talent_analytics_insights.webp',
      '/images/kafaa-ats/06_arabic_rtl_hr_dashboard.webp',
      '/images/kafaa-ats/07_candidate_evaluation_modal.webp'
    ]
  },
  {
    id: 'p4',
    number: '04',
    slug: 'talking-ai',
    image: '/images/talking-ai/01_voice_assistant_hero.webp',
    gallery: [
      '/images/talking-ai/01_voice_assistant_hero.webp',
      '/images/talking-ai/02_document_slide_analyzer.webp',
      '/images/talking-ai/03_streaming_transcript_view.webp',
      '/images/talking-ai/04_audio_waveform_telemetry.webp',
      '/images/talking-ai/05_reasoning_thought_drawer.webp',
      '/images/talking-ai/06_voice_persona_settings.webp',
      '/images/talking-ai/07_arabic_voice_intelligence.webp'
    ]
  },
  {
    id: 'p5',
    number: '05',
    slug: 'skycourt-complex',
    image: '/images/skycourt-complex/01_destination_hero_portal.webp',
    gallery: [
      '/images/skycourt-complex/01_destination_hero_portal.webp',
      '/images/skycourt-complex/02_dining_directory.webp',
      '/images/skycourt-complex/03_dining_experience.webp',
      '/images/skycourt-complex/04_about_destination.webp',
      '/images/skycourt-complex/05_arabic_rtl_skycourt.webp',
      '/images/skycourt-complex/06_atmosphere_stories.webp',
      '/images/skycourt-complex/07_location_visit_planner.webp'
    ]
  },
  {
    id: 'p6',
    number: '06',
    slug: 'hard-turso-notes',
    image: '/images/hard-turso-notes/01_markdown_editor_canvas.webp',
    gallery: [
      '/images/hard-turso-notes/01_markdown_editor_canvas.webp',
      '/images/hard-turso-notes/02_hierarchical_notebook_tree.webp',
      '/images/hard-turso-notes/03_opfs_sqlite_telemetry.webp',
      '/images/hard-turso-notes/04_turso_cloud_sync_ledger.webp',
      '/images/hard-turso-notes/05_tags_metadata_manager.webp',
      '/images/hard-turso-notes/06_rich_typography_preview.webp',
      '/images/hard-turso-notes/07_dark_mode_distraction_free.webp'
    ]
  },
  {
    id: 'p7',
    number: '07',
    slug: 'study-cafe-step',
    image: '/images/study-cafe-step/01_active_sessions_dashboard.webp',
    gallery: [
      '/images/study-cafe-step/01_active_sessions_dashboard.webp',
      '/images/study-cafe-step/02_catering_pos_menu.webp',
      '/images/study-cafe-step/03_new_seat_ticket_modal.webp',
      '/images/study-cafe-step/04_room_booking_modal.webp',
      '/images/study-cafe-step/05_filtered_rooms_view.webp',
      '/images/study-cafe-step/06_seats_filter_view.webp',
      '/images/study-cafe-step/07_checkout_receipt_modal.webp'
    ]
  },
  {
    id: 'p8',
    number: '08',
    slug: 'real-estate-mockup',
    image: '/images/real-estate-mockup/01_real_estate_hero.webp',
    gallery: [
      '/images/real-estate-mockup/01_real_estate_hero.webp',
      '/images/real-estate-mockup/02_property_listings_catalog.webp',
      '/images/real-estate-mockup/03_property_detail_showcase.webp',
      '/images/real-estate-mockup/04_mortgage_calculator.webp',
      '/images/real-estate-mockup/05_arabic_rtl_real_estate.webp',
      '/images/real-estate-mockup/06_neighborhood_amenities_map.webp',
      '/images/real-estate-mockup/07_ai_concierge_booking_drawer.webp'
    ]
  },
  {
    id: 'p9',
    number: '09',
    slug: 'abaad-al-erteqa',
    image: '/images/abaad-al-erteqa/01_luxury_corporate_hero.webp',
    gallery: [
      '/images/abaad-al-erteqa/01_luxury_corporate_hero.webp',
      '/images/abaad-al-erteqa/02_architectural_projects_grid.webp',
      '/images/abaad-al-erteqa/03_corporate_synergy_portal.webp',
      '/images/abaad-al-erteqa/04_sama_contracting_portfolio.webp',
      '/images/abaad-al-erteqa/05_client_marquee_partners.webp',
      '/images/abaad-al-erteqa/06_arabic_rtl_corporate_view.webp',
      '/images/abaad-al-erteqa/07_contact_synergy_gateway.webp'
    ]
  },
  {
    id: 'p10',
    number: '10',
    slug: 'ai-mood-jockey',
    image: '/images/ai-mood-jockey/01_mood_generator_hero.webp',
    gallery: [
      '/images/ai-mood-jockey/01_mood_generator_hero.webp',
      '/images/ai-mood-jockey/02_jamendo_playlist_player.webp',
      '/images/ai-mood-jockey/03_valence_energy_telemetry.webp',
      '/images/ai-mood-jockey/04_mood_history_journal.webp',
      '/images/ai-mood-jockey/05_genre_instrumental_filters.webp',
      '/images/ai-mood-jockey/06_playlist_exporter_modal.webp',
      '/images/ai-mood-jockey/07_live_audio_visualizer.webp'
    ]
  },
  // Column 2 (Right Track: 10 Projects)
  {
    id: 'p11',
    number: '11',
    slug: 'texture-extractor',
    image: '/images/texture-extractor/01_ai_smart_select.webp',
    gallery: [
      '/images/texture-extractor/01_ai_smart_select.webp',
      '/images/texture-extractor/02_perspective_rectify.webp',
      '/images/texture-extractor/03_uv_mesh_fit.webp',
      '/images/texture-extractor/04_curved_ellipse_fit.webp',
      '/images/texture-extractor/05_mask_cleanup.webp',
      '/images/texture-extractor/06_addon_sidebar.webp',
      '/images/texture-extractor/07_texture_library.webp'
    ]
  },
  {
    id: 'p12',
    number: '12',
    slug: 'o2mation-chatbot',
    image: '/images/o2mation-chatbot/01_overview_dashboard.webp',
    gallery: [
      '/images/o2mation-chatbot/01_overview_dashboard.webp',
      '/images/o2mation-chatbot/02_live_chat_queue.webp',
      '/images/o2mation-chatbot/03_agent_takeover_chat.webp',
      '/images/o2mation-chatbot/04_knowledge_base.webp',
      '/images/o2mation-chatbot/05_bot_settings.webp',
      '/images/o2mation-chatbot/06_plans_credits.webp',
      '/images/o2mation-chatbot/07_landing_page.webp'
    ]
  },
  {
    id: 'p13',
    number: '13',
    slug: 'voice-ai-telephony',
    image: '/images/voice-ai-telephony/01_voice_telephony_hud.webp',
    gallery: [
      '/images/voice-ai-telephony/01_voice_telephony_hud.webp',
      '/images/voice-ai-telephony/02_realtime_call_transcript.webp',
      '/images/voice-ai-telephony/03_tool_calling_sms_flow.webp',
      '/images/voice-ai-telephony/04_audio_latency_jitter_telemetry.webp',
      '/images/voice-ai-telephony/05_knowledge_base_grounding.webp',
      '/images/voice-ai-telephony/06_arabic_voice_telephony.webp',
      '/images/voice-ai-telephony/07_call_session_diagnostics.webp'
    ]
  },
  {
    id: 'p14',
    number: '14',
    slug: 'split-diffusion',
    image: '/images/split-diffusion/01_architecture_overview.webp',
    gallery: [
      '/images/split-diffusion/01_architecture_overview.webp',
      '/images/split-diffusion/02_desktop_inpainting_app.webp',
      '/images/split-diffusion/03_job_progress.webp',
      '/images/split-diffusion/04_relay_integrity.webp',
      '/images/split-diffusion/05_before_after.webp',
      '/images/split-diffusion/06_gpu_worker_telemetry.webp',
      '/images/split-diffusion/07_cli_roundtrip.webp'
    ]
  },
  {
    id: 'p15',
    number: '15',
    slug: 'substance-livelink',
    image: '/images/substance-livelink/01_two_way_sync.webp',
    gallery: [
      '/images/substance-livelink/01_two_way_sync.webp',
      '/images/substance-livelink/02_painter_panel.webp',
      '/images/substance-livelink/03_blender_export_panel.webp',
      '/images/substance-livelink/04_auto_wired_nodes.webp',
      '/images/substance-livelink/05_mesh_hot_reload.webp',
      '/images/substance-livelink/06_channel_export_settings.webp',
      '/images/substance-livelink/07_final_render.webp'
    ]
  },
  {
    id: 'p16',
    number: '16',
    slug: 'ai-career-flow',
    image: '/images/ai-career-flow/01_career_architect_hero.webp',
    gallery: [
      '/images/ai-career-flow/01_career_architect_hero.webp',
      '/images/ai-career-flow/02_cv_extracted_profile_modal.webp',
      '/images/ai-career-flow/03_conversational_recruiter_chat.webp',
      '/images/ai-career-flow/04_technical_interview_simulator.webp',
      '/images/ai-career-flow/05_candidate_radar_analytics.webp',
      '/images/ai-career-flow/06_market_salary_benchmark.webp',
      '/images/ai-career-flow/07_stage_progress_tracker.webp'
    ]
  },
  {
    id: 'p17',
    number: '17',
    slug: 'o2mation-pos',
    image: '/images/o2mation-pos/01_cashier_checkout_register.webp',
    gallery: [
      '/images/o2mation-pos/01_cashier_checkout_register.webp',
      '/images/o2mation-pos/02_inventory_records.webp',
      '/images/o2mation-pos/03_category_hierarchy_tree.webp',
      '/images/o2mation-pos/04_vendor_management.webp',
      '/images/o2mation-pos/05_pos_login_portal.webp',
      '/images/o2mation-pos/06_arabic_rtl_pos_interface.webp',
      '/images/o2mation-pos/07_product_stock_drawer.webp'
    ]
  },
  {
    id: 'p18',
    number: '18',
    slug: 'maran-atha',
    image: '/images/maran-atha/01_hero_portal.webp',
    gallery: [
      '/images/maran-atha/01_hero_portal.webp',
      '/images/maran-atha/02_sectors_showcase.webp',
      '/images/maran-atha/03_sector_detail.webp',
      '/images/maran-atha/04_products_catalog.webp',
      '/images/maran-atha/05_corporate_story.webp',
      '/images/maran-atha/06_arabic_rtl_portal.webp',
      '/images/maran-atha/07_contact_consultation.webp'
    ]
  },
  {
    id: 'p19',
    number: '19',
    slug: 'questmarket-gaming',
    image: '/images/questmarket-gaming/01_marketplace_storefront.webp',
    gallery: [
      '/images/questmarket-gaming/01_marketplace_storefront.webp',
      '/images/questmarket-gaming/02_lol_asset_store.webp',
      '/images/questmarket-gaming/03_pubg_asset_store.webp',
      '/images/questmarket-gaming/04_shopping_cart_checkout.webp',
      '/images/questmarket-gaming/05_seller_dashboard_hub.webp',
      '/images/questmarket-gaming/06_arabic_rtl_marketplace.webp',
      '/images/questmarket-gaming/07_item_listing_detail.webp'
    ]
  },
  {
    id: 'p20',
    number: '20',
    slug: 'o2-salary-suite',
    image: '/images/o2-salary-suite/01_payroll_dashboard_overview.webp',
    gallery: [
      '/images/o2-salary-suite/01_payroll_dashboard_overview.webp',
      '/images/o2-salary-suite/02_org_hierarchy_tree.webp',
      '/images/o2-salary-suite/03_salary_calculations_table.webp',
      '/images/o2-salary-suite/04_settings_compensation_rules.webp',
      '/images/o2-salary-suite/05_arabic_rtl_payroll_suite.webp',
      '/images/o2-salary-suite/06_auth_login_portal.webp',
      '/images/o2-salary-suite/07_printable_payslip_modal.webp'
    ]
  }
];

export const ARCHIVE_COUNT = ARCHIVE_ENTRIES.length;
