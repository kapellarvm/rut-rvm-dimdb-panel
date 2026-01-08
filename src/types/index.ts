import { UserRole, DimDbStatus, SimCardStatus } from '@prisma/client'

export type { UserRole, DimDbStatus, SimCardStatus }

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
  lastLogin: Date | null
}

export interface Router {
  id: string
  boxNoPrefix: string | null
  boxNo: string
  serialNumber: string
  imei: string
  macAddress: string
  firmware: string | null
  ssid: string | null
  wifiPassword: string | null
  devicePassword: string | null
  rvmUnitId: string | null
  dimDbId: string | null
  simCardId: string | null
  createdAt: Date
  updatedAt: Date
  importedAt: Date
  rvmUnit?: RvmUnit | null
  dimDb?: DimDb | null
  simCard?: SimCard | null
}

export interface RvmUnit {
  id: string
  rvmId: string
  name: string | null
  location: string | null
  createdAt: Date
  updatedAt: Date
  routers?: Router[]
  _count?: {
    routers: number
  }
}

export interface DimDb {
  id: string
  dimDbCode: string
  description: string | null
  status: DimDbStatus
  createdAt: Date
  updatedAt: Date
  routers?: Router[]
  _count?: {
    routers: number
  }
}

export interface SimCard {
  id: string
  phoneNumber: string
  status: SimCardStatus
  createdAt: Date
  updatedAt: Date
  routers?: Router[]
  _count?: {
    routers: number
  }
}

export interface ActivityLog {
  id: string
  action: string
  entityType: string
  entityId: string | null
  details: Record<string, unknown> | null
  createdAt: Date
  userId: string
  user?: User
}

export interface DashboardStats {
  totalRouters: number
  totalRvmUnits: number
  assignedDimDb: number
  unassignedRouters: number
}

export interface ImportResult {
  success: boolean
  newCount: number
  updatedCount: number
  errorCount: number
  errors: ImportError[]
  warnings: ImportWarning[]
}

export interface ImportError {
  row: number
  field: string
  message: string
  value?: string
}

export interface ImportWarning {
  row: number
  field: string
  message: string
  value?: string
}

export interface ParsedRouterRow {
  boxNoPrefix?: string
  boxNo?: string
  serialNumber?: string
  imei?: string
  macAddress?: string
  firmware?: string
  ssid?: string
  wifiPassword?: string
  devicePassword?: string
  rvmId?: string
  dimDbId?: string
  simCardPhone?: string
}

export interface ColumnMapping {
  excelColumn: string
  systemField: keyof ParsedRouterRow | null
  confidence: number
}

export interface ImportPreview {
  totalRows: number
  newRecords: number
  existingRecords: number
  duplicates: number
  errors: ImportError[]
  columnMappings: ColumnMapping[]
  sampleData: ParsedRouterRow[]
}

export interface FilterState {
  search: string
  rvmUnitId: string | null
  dimDbStatus: 'all' | 'assigned' | 'unassigned'
  firmware: string | null
  dateFrom: Date | null
  dateTo: Date | null
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export interface SortState {
  field: string
  direction: 'asc' | 'desc'
}
