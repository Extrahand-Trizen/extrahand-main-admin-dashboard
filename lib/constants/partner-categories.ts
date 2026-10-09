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
};

export const PARTNER_CATEGORY_SKILLS: Record<string, Record<string, string>> = {
  electrician: {
    fan_installation: 'Fan Installation & Repair',
    switch_socket_repair: 'Switch & Socket Repair',
    wiring_rewiring: 'Wiring & Rewiring',
    light_installation: 'Light Installation',
    mcb_fuse_repair: 'MCB/Fuse Repair',
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
  driving: {
    personal_driver: 'Personal Driver',
    driver_on_demand: 'Driver On Demand',
    commercial_driver: 'Commercial Driver',
  },
};

export function getPartnerCategoryLabel(categoryId: string): string {
  return PARTNER_CATEGORY_LABELS[categoryId] ??
    categoryId.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
