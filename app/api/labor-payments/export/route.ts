import { createCsvExportRoute } from '@/lib/csv-export-route'

export const dynamic = 'force-dynamic'

export const { GET } = createCsvExportRoute('labor-payments', 'labor-payments.csv')
