import { createCsvExportRoute } from '@/lib/csv-export-route'

export const dynamic = 'force-dynamic'

export const { GET } = createCsvExportRoute('project-contracts', 'project-contracts.csv')
