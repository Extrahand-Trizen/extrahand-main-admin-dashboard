export const PARTNER_CATEGORY_LABELS: Record<string, string> = {
  cleaning: 'Cleaning',
  electrician: 'Electrician',
  appliance_repair: 'Appliance Repair',
  ac_service: 'AC Service',
  plumbing: 'Plumbing',
  carpentry: 'Carpentry',
  pest_control: 'Pest Control',
  beauty_services: 'Beauty Services',
  painting: 'Painting',
  delivery_logistics: 'Delivery & Logistics',
  driving: 'Driving',
  laundry: 'Laundry',
  car_wash: 'Car Wash',
  'daily-labour': 'Daily Labour',
};

export const PARTNER_APP_CATEGORY_IDS = [
  'cleaning',
  'electrician',
  'appliance_repair',
  'ac_service',
  'plumbing',
  'carpentry',
  'pest_control',
  'beauty_services',
  'painting',
  'delivery_logistics',
  'driving',
  'laundry',
  'car_wash',
  'daily-labour',
] as const;

export const PARTNER_CATEGORY_SKILLS: Record<string, Record<string, string>> = {
  cleaning: {
    regular_home_cleaning: 'Regular Home Cleaning',
    deep_cleaning: 'Deep Cleaning',
    kitchen_bathroom_cleaning: 'Kitchen & Bathroom Cleaning',
    sofa_carpet_cleaning: 'Sofa & Carpet Cleaning',
    office_cleaning: 'Office Cleaning',
  },
  electrician: {
    fan_installation: 'Fan Installation & Repair',
    switch_socket_repair: 'Switch & Socket Repair',
    wiring_rewiring: 'Wiring & Rewiring',
    light_installation: 'Light Installation',
    mcb_fuse_repair: 'MCB/Fuse Repair',
  },
  plumbing: {
    tap_faucet_repair: 'Tap & Faucet Repair',
    pipe_leak_repair: 'Pipe Leak Repair',
    toilet_flush_repair: 'Toilet & Flush Repair',
    wash_basin_installation: 'Wash Basin Installation',
    water_tank_motor_installation: 'Water Tank & Motor Installation',
  },
  carpentry: {
    furniture_repair: 'Furniture Repair',
    furniture_assembly: 'Furniture Assembly',
    door_window_repair: 'Door & Window Repair',
    modular_kitchen_work: 'Modular Kitchen Work',
    shelf_installation: 'Shelf Installation',
  },
  pest_control: {
    general_pest_control: 'General Pest Control',
    termite_treatment: 'Termite Treatment',
    cockroach_control: 'Cockroach Control',
    mosquito_control: 'Mosquito Control',
    rodent_control: 'Rodent Control',
  },
  beauty_services: {
    haircut_styling: 'Haircut & Styling',
    hair_coloring: 'Hair Coloring',
    makeup: 'Makeup & Party Makeup',
    manicure_pedicure: 'Manicure & Pedicure',
    facials_skin_care: 'Facials & Skin Care',
  },
  painting: {
    interior_painting: 'Interior Painting',
    exterior_painting: 'Exterior Painting',
    wall_putty: 'Wall Putty',
    texture_painting: 'Texture Painting',
    waterproof_coating: 'Waterproof Coating',
  },
  appliance_repair: {
    washing_machine_repair: 'Washing Machine Repair',
    refrigerator_repair: 'Refrigerator Repair',
    microwave_repair: 'Microwave Repair',
    tv_repair: 'TV Repair',
    water_purifier_repair: 'Water Purifier Repair',
  },
  ac_service: {
    ac_installation: 'AC Installation',
    ac_general_service: 'AC General Service',
    gas_filling: 'Gas Filling',
    cooling_issue_repair: 'Cooling Issue Repair',
    ac_uninstallation: 'AC Uninstallation',
  },
  delivery_logistics: {
    pickup_drop: 'Pickup & Drop',
    courier: 'Courier Delivery',
    grocery: 'Grocery Delivery',
    parcel: 'Parcel Delivery',
    quick_commerce_delivery: 'Quick Commerce Delivery',
  },
  laundry: {
    wash_by_weight: 'Wash by Weight',
    ironing_services: 'Ironing Services',
    traditional_wear: 'Traditional Wear',
    bedding_and_blankets: 'Bedding & Blankets',
    shoe_cleaning: 'Shoe Cleaning',
  },
  car_wash: {
    basic_car_wash: 'Basic Car Wash',
    premium_car_wash: 'Premium Car Wash',
    car_interior_deep_cleaning: 'Car Interior Deep Cleaning',
    car_sanitization: 'Car Sanitization',
  },
  driving: {
    personal_driver: 'Personal Driver',
    driver_on_demand: 'Driver On Demand',
    commercial_driver: 'Commercial Driver',
  },
  'daily-labour': {
    construction_labour: 'Construction Labour',
    loading_unloading: 'Loading & Unloading',
    material_handling: 'Material Handling',
    site_cleaning: 'Site Cleaning',
    digging_earthwork: 'Digging & Earthwork',
    shifting_moving: 'Shifting & Moving',
    general_manual_labour: 'General Manual Labour',
  },
};

export function getPartnerCategoryLabel(categoryId: string): string {
  return PARTNER_CATEGORY_LABELS[categoryId] ??
    categoryId.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
