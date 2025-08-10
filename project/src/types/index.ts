export interface Organization {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  email: string;
  name?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  _id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  createdAt: string;
}

export interface ProfileFieldDef {
  _id: string;
  organizationId: string;
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'select' | 'multiselect' | 'email' | 'phone' | 'url';
  options?: { value: string; label: string }[];
  required: boolean;
  visibility: 'public' | 'staff_only';
  archived: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  _id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'visitor';
  fields?: Record<string, any>;
  householdId?: string;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Household {
  _id: string;
  organizationId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdMember {
  _id: string;
  organizationId: string;
  householdId: string;
  personId: string;
  relationship: 'head' | 'spouse' | 'child' | 'other';
}

export interface Tag {
  _id: string;
  organizationId: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface Note {
  _id: string;
  organizationId: string;
  personId: string;
  authorUserId: string;
  body: string;
  visibility: 'staff_only' | 'org';
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  count?: number;
  projectId?: string;
  collection?: string;
}