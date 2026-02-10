export interface FleetConfig {
  id: string;
  name: string;
  type: 'parent' | 'child' | 'independent';
  parentId?: string;
  budget?: string;
}

export const FLEET_HIERARCHY: FleetConfig[] = [
  {
    id: '8304669',
    name: '(F6) Planning Automation And Optimization',
    type: 'parent',
    budget: '$2.36M'
  },
  {
    id: '8305082',
    name: '(F7) Capacity Plan Automation and Optimization',
    type: 'child',
    parentId: '8304669',
    budget: '$812.9K'
  },
  {
    id: '8304674',
    name: '(F7) Plan Automation',
    type: 'child',
    parentId: '8304669',
    budget: '$623.7K'
  },
  {
    id: '10089347',
    name: '(F7) AI Automation',
    type: 'child',
    parentId: '8304669',
    budget: '$888.7K'
  },
  {
    id: '8967127',
    name: '(F7) Planning Automation',
    type: 'child',
    parentId: '8304669',
    budget: '$32.9K'
  }
];

export function getFleetById(id: string): FleetConfig | undefined {
  return FLEET_HIERARCHY.find(fleet => fleet.id === id);
}

export function getChildFleets(parentId: string): FleetConfig[] {
  return FLEET_HIERARCHY.filter(fleet => fleet.parentId === parentId);
}

export function getParentFleets(): FleetConfig[] {
  return FLEET_HIERARCHY.filter(fleet => fleet.type === 'parent' || fleet.type === 'independent');
}
