/**
 * scripts/seed-all-forms.ts  - 初始化所有业务模块表单定义
 * 运行: npx tsx scripts/seed-all-forms.ts
 */
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"
const prisma = new PrismaClient()

type FieldDef = {
  label: string; fieldKey: string; componentType: string;
  required: boolean; sortOrder: number;
  optionsJson?: string; dependsOn?: string; dependsValue?: string;
  computeFormula?: string; linkedTable?: string; linkedLabelField?: string;
  linkedValueField?: string; linkedCopyFields?: string;
  placeholder?: string; isReadonly?: boolean; tableColumnsJson?: string;
}
type FormDef = { code: string; name: string; fields: FieldDef[] }

function buildFormFieldCreateManyInput(formId: string, field: FieldDef) {
  return {
    id: randomUUID(),
    formId,
    ...field,
  }
}

function buildFormFieldCreateInput(field: FieldDef) {
  return {
    id: randomUUID(),
    ...field,
  }
}

const FORMS: FormDef[] = [
  // 1. 项目新增
  { code: "projects", name: "项目新增", fields: [
    { label: "项目名称", fieldKey: "name", componentType: "input", required: true, sortOrder: 1 },
    { label: "客户名称", fieldKey: "customerId", componentType: "cascadeSelect", required: true, sortOrder: 2, linkedTable: "customers", linkedLabelField: "name", linkedValueField: "id" },
    { label: "项目地点", fieldKey: "location", componentType: "input", required: true, sortOrder: 3 },
    { label: "项目类型", fieldKey: "projectType", componentType: "select", required: true, sortOrder: 4, optionsJson: JSON.stringify(["装修","广告","采购","设计","其他"]) },
    { label: "招标方式", fieldKey: "bidMethod", componentType: "select", required: true, sortOrder: 5, optionsJson: JSON.stringify(["公开招标","阳光平台","不招标"]) },
    { label: "项目面积(㎡)", fieldKey: "area", componentType: "number", required: false, sortOrder: 6 },
    { label: "预算金额", fieldKey: "budget", componentType: "number", required: true, sortOrder: 7 },
    { label: "开始日期", fieldKey: "startDate", componentType: "date", required: false, sortOrder: 8 },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: false, sortOrder: 9 },
  ]},
  // 2. 项目合同
  { code: "project-contracts", name: "项目合同", fields: [
    { label: "合同名称", fieldKey: "name", componentType: "input", required: true, sortOrder: 1 },
    { label: "关联项目", fieldKey: "projectId", componentType: "cascadeSelect", required: true, sortOrder: 2, linkedTable: "projects", linkedLabelField: "name", linkedValueField: "id" },
    { label: "客户名称", fieldKey: "customerId", componentType: "cascadeSelect", required: true, sortOrder: 3, linkedTable: "customers", linkedLabelField: "name", linkedValueField: "id" },
    { label: "合同金额", fieldKey: "contractAmount", componentType: "number", required: true, sortOrder: 4 },
    { label: "合同类型", fieldKey: "contractType", componentType: "select", required: true, sortOrder: 5, optionsJson: JSON.stringify(["固定总价","固定单价","可变总价","可变单价"]) },
    { label: "签订日期", fieldKey: "signDate", componentType: "date", required: false, sortOrder: 6 },
    { label: "开工日期", fieldKey: "startDate", componentType: "date", required: true, sortOrder: 7 },
    { label: "竣工日期", fieldKey: "endDate", componentType: "date", required: false, sortOrder: 8 },
    { label: "付款方式", fieldKey: "paymentMethod", componentType: "select", required: true, sortOrder: 9, optionsJson: JSON.stringify(["按进度","按合同","其他"]) },
    { label: "有无质保金", fieldKey: "hasRetention", componentType: "select", required: true, sortOrder: 10, optionsJson: JSON.stringify(["有","无"]) },
    { label: "质保金比例(%)", fieldKey: "retentionRate", componentType: "number", required: false, sortOrder: 11, dependsOn: "hasRetention", dependsValue: "有" },
    { label: "质保金金额", fieldKey: "retentionAmount", componentType: "number", required: false, sortOrder: 12, dependsOn: "hasRetention", dependsValue: "有", computeFormula: "contractAmount * retentionRate / 100", isReadonly: true },
    { label: "已收金额", fieldKey: "receivedAmount", componentType: "number", required: false, sortOrder: 13, isReadonly: true, placeholder: "自动从收款记录汇总" },
    { label: "未收金额", fieldKey: "unreceivedAmount", componentType: "number", required: false, sortOrder: 14, isReadonly: true, computeFormula: "contractAmount - receivedAmount" },
    { label: "合同附件", fieldKey: "attachmentUrl", componentType: "file", required: false, sortOrder: 15 },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: false, sortOrder: 16 },
  ]},
  // 3. 项目合同收款
  { code: "contract-receipts", name: "项目合同收款", fields: [
    { label: "关联项目合同", fieldKey: "contractId", componentType: "cascadeSelect", required: true, sortOrder: 1, linkedTable: "project-contracts", linkedLabelField: "name", linkedValueField: "id" },
    { label: "收款金额", fieldKey: "receiptAmount", componentType: "number", required: true, sortOrder: 2 },
    { label: "收款日期", fieldKey: "receiptDate", componentType: "date", required: true, sortOrder: 3 },
    { label: "收款方式", fieldKey: "receiptMethod", componentType: "select", required: false, sortOrder: 4, optionsJson: JSON.stringify(["转账","现金","支票","其他"]) },
    { label: "费用明细扣款", fieldKey: "deductionItems", componentType: "table", required: false, sortOrder: 5, tableColumnsJson: JSON.stringify([{key:"type",label:"扣款类型",componentType:"select",options:["税金","手续费","管理费","其他"]},{key:"amount",label:"金额",componentType:"number"}]) },
    { label: "附件", fieldKey: "attachmentUrl", componentType: "file", required: false, sortOrder: 6 },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: false, sortOrder: 7 },
  ]},
  // 4. 施工立项
  { code: "construction-approvals", name: "施工立项", fields: [
    { label: "立项名称", fieldKey: "name", componentType: "input", required: true, sortOrder: 1 },
    { label: "关联项目", fieldKey: "projectId", componentType: "cascadeSelect", required: true, sortOrder: 2, linkedTable: "projects", linkedLabelField: "name", linkedValueField: "id" },
    { label: "关联项目合同", fieldKey: "contractId", componentType: "cascadeSelect", required: true, sortOrder: 3, linkedTable: "project-contracts", linkedLabelField: "name", linkedValueField: "id" },
    { label: "预算金额", fieldKey: "budget", componentType: "number", required: true, sortOrder: 4 },
    { label: "开始日期", fieldKey: "startDate", componentType: "date", required: false, sortOrder: 5 },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: false, sortOrder: 6 },
  ]},
  // 5. 采购合同
  { code: "procurement-contracts", name: "采购合同", fields: [
    { label: "采购合同名称", fieldKey: "name", componentType: "input", required: true, sortOrder: 1 },
    { label: "关联施工立项", fieldKey: "constructionId", componentType: "cascadeSelect", required: true, sortOrder: 2, linkedTable: "construction-approvals", linkedLabelField: "name", linkedValueField: "id" },
    { label: "关联项目", fieldKey: "projectId", componentType: "cascadeSelect", required: true, sortOrder: 3, linkedTable: "projects", linkedLabelField: "name", linkedValueField: "id" },
    { label: "供应商", fieldKey: "supplierId", componentType: "cascadeSelect", required: true, sortOrder: 4, linkedTable: "suppliers", linkedLabelField: "name", linkedValueField: "id" },
    { label: "材料类别", fieldKey: "materialCategory", componentType: "select", required: true, sortOrder: 5, optionsJson: JSON.stringify(["油工材料","木工材料","瓦工材料","水电材料","其他杂项"]) },
    { label: "合同金额", fieldKey: "contractAmount", componentType: "number", required: true, sortOrder: 6 },
    { label: "已付金额", fieldKey: "paidAmount", componentType: "number", required: false, sortOrder: 7, isReadonly: true, placeholder: "付款后自动更新" },
    { label: "应付金额", fieldKey: "payableAmount", componentType: "number", required: false, sortOrder: 8, isReadonly: true, placeholder: "付款后自动更新" },
    { label: "签订日期", fieldKey: "signDate", componentType: "date", required: false, sortOrder: 9 },
    { label: "附件", fieldKey: "attachmentUrl", componentType: "file", required: false, sortOrder: 10 },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: false, sortOrder: 11 },
  ]},
  // 6. 采购付款
  { code: "procurement-payments", name: "采购付款", fields: [
    { label: "采购合同名称", fieldKey: "contractId", componentType: "cascadeSelect", required: true, sortOrder: 1, linkedTable: "procurement-contracts", linkedLabelField: "name", linkedValueField: "id", linkedCopyFields: JSON.stringify([{from:"supplier.name",to:"supplierName"},{from:"supplier.bankAccount",to:"bankCard"},{from:"supplier.bankName",to:"bankName"},{from:"supplier.phone",to:"phone"},{from:"paidAmount",to:"paidAmount"},{from:"payableAmount",to:"payableAmount"}]) },
    { label: "关联项目", fieldKey: "projectId", componentType: "cascadeSelect", required: true, sortOrder: 2, linkedTable: "projects", linkedLabelField: "name", linkedValueField: "id" },
    { label: "供应商名称", fieldKey: "supplierName", componentType: "input", required: true, sortOrder: 3, isReadonly: true },
    { label: "银行卡", fieldKey: "bankCard", componentType: "input", required: true, sortOrder: 4, isReadonly: true },
    { label: "开户行", fieldKey: "bankName", componentType: "input", required: true, sortOrder: 5, isReadonly: true },
    { label: "电话", fieldKey: "phone", componentType: "input", required: true, sortOrder: 6, isReadonly: true },
    { label: "已付金额", fieldKey: "paidAmount", componentType: "number", required: false, sortOrder: 7, isReadonly: true },
    { label: "应付金额", fieldKey: "payableAmount", componentType: "number", required: false, sortOrder: 8, isReadonly: true },
    { label: "本次付款金额", fieldKey: "paymentAmount", componentType: "number", required: true, sortOrder: 9 },
    { label: "付款日期", fieldKey: "paymentDate", componentType: "date", required: true, sortOrder: 10 },
    { label: "附件", fieldKey: "attachmentUrl", componentType: "file", required: false, sortOrder: 11 },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: false, sortOrder: 12 },
  ]},
  // 7. 劳务合同
  { code: "labor-contracts", name: "劳务合同", fields: [
    { label: "劳务合同名称", fieldKey: "name", componentType: "input", required: true, sortOrder: 1 },
    { label: "关联项目", fieldKey: "projectId", componentType: "cascadeSelect", required: true, sortOrder: 2, linkedTable: "projects", linkedLabelField: "name", linkedValueField: "id" },
    { label: "关联施工立项", fieldKey: "constructionId", componentType: "cascadeSelect", required: true, sortOrder: 3, linkedTable: "construction-approvals", linkedLabelField: "name", linkedValueField: "id" },
    { label: "劳务人员", fieldKey: "workerId", componentType: "cascadeSelect", required: true, sortOrder: 4, linkedTable: "labor-workers", linkedLabelField: "name", linkedValueField: "id" },
    { label: "劳务类型", fieldKey: "laborType", componentType: "select", required: true, sortOrder: 5, optionsJson: JSON.stringify(["腻子工","瓦工","木工","油工","零工","其它"]) },
    { label: "合同金额", fieldKey: "contractAmount", componentType: "number", required: true, sortOrder: 6 },
    { label: "已付金额", fieldKey: "paidAmount", componentType: "number", required: false, sortOrder: 7, isReadonly: true, placeholder: "付款后自动更新" },
    { label: "应付金额", fieldKey: "payableAmount", componentType: "number", required: false, sortOrder: 8, isReadonly: true, placeholder: "付款后自动更新" },
    { label: "签订日期", fieldKey: "signDate", componentType: "date", required: false, sortOrder: 9 },
    { label: "附件", fieldKey: "attachmentUrl", componentType: "file", required: false, sortOrder: 10 },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: false, sortOrder: 11 },
  ]},
  // 8. 劳务付款
  { code: "labor-payments", name: "劳务付款", fields: [
    { label: "劳务合同名称", fieldKey: "contractId", componentType: "cascadeSelect", required: true, sortOrder: 1, linkedTable: "labor-contracts", linkedLabelField: "name", linkedValueField: "id", linkedCopyFields: JSON.stringify([{from:"worker.name",to:"workerName"},{from:"worker.bankAccount",to:"bankCard"},{from:"worker.bankName",to:"bankName"},{from:"worker.idNumber",to:"idNumber"},{from:"worker.phone",to:"phone"},{from:"paidAmount",to:"paidAmount"},{from:"payableAmount",to:"payableAmount"}]) },
    { label: "关联项目", fieldKey: "projectId", componentType: "cascadeSelect", required: true, sortOrder: 2, linkedTable: "projects", linkedLabelField: "name", linkedValueField: "id" },
    { label: "劳务人员姓名", fieldKey: "workerName", componentType: "input", required: true, sortOrder: 3, isReadonly: true },
    { label: "银行卡", fieldKey: "bankCard", componentType: "input", required: true, sortOrder: 4, isReadonly: true },
    { label: "开户行", fieldKey: "bankName", componentType: "input", required: true, sortOrder: 5, isReadonly: true },
    { label: "身份证号", fieldKey: "idNumber", componentType: "input", required: true, sortOrder: 6, isReadonly: true },
    { label: "电话", fieldKey: "phone", componentType: "input", required: true, sortOrder: 7, isReadonly: true },
    { label: "已付金额", fieldKey: "paidAmount", componentType: "number", required: false, sortOrder: 8, isReadonly: true },
    { label: "应付金额", fieldKey: "payableAmount", componentType: "number", required: false, sortOrder: 9, isReadonly: true },
    { label: "本次付款金额", fieldKey: "paymentAmount", componentType: "number", required: true, sortOrder: 10 },
    { label: "付款日期", fieldKey: "paymentDate", componentType: "date", required: true, sortOrder: 11 },
    { label: "附件", fieldKey: "attachmentUrl", componentType: "file", required: false, sortOrder: 12 },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: false, sortOrder: 13 },
  ]},
  // 9. 分包合同
  { code: "subcontract-contracts", name: "分包合同", fields: [
    { label: "分包合同名称", fieldKey: "name", componentType: "input", required: true, sortOrder: 1 },
    { label: "关联项目", fieldKey: "projectId", componentType: "cascadeSelect", required: true, sortOrder: 2, linkedTable: "projects", linkedLabelField: "name", linkedValueField: "id" },
    { label: "关联施工立项", fieldKey: "constructionId", componentType: "cascadeSelect", required: true, sortOrder: 3, linkedTable: "construction-approvals", linkedLabelField: "name", linkedValueField: "id" },
    { label: "分包类型", fieldKey: "subcontractType", componentType: "select", required: true, sortOrder: 4, optionsJson: JSON.stringify(["装修","广告","设计","其它"]) },
    { label: "合同金额", fieldKey: "contractAmount", componentType: "number", required: true, sortOrder: 5 },
    { label: "已付金额", fieldKey: "paidAmount", componentType: "number", required: false, sortOrder: 6, isReadonly: true, placeholder: "付款后自动更新" },
    { label: "应付金额", fieldKey: "payableAmount", componentType: "number", required: false, sortOrder: 7, isReadonly: true, placeholder: "付款后自动更新" },
    { label: "签订日期", fieldKey: "signDate", componentType: "date", required: false, sortOrder: 8 },
    { label: "附件", fieldKey: "attachmentUrl", componentType: "file", required: false, sortOrder: 9 },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: false, sortOrder: 10 },
  ]},
  // 10. 分包付款
  { code: "subcontract-payments", name: "分包付款", fields: [
    { label: "分包合同名称", fieldKey: "contractId", componentType: "cascadeSelect", required: true, sortOrder: 1, linkedTable: "subcontract-contracts", linkedLabelField: "name", linkedValueField: "id", linkedCopyFields: JSON.stringify([{from:"vendor.name",to:"vendorName"},{from:"vendor.bankAccount",to:"bankCard"},{from:"vendor.bankName",to:"bankName"},{from:"vendor.idNumber",to:"idNumber"},{from:"vendor.phone",to:"phone"},{from:"paidAmount",to:"paidAmount"},{from:"payableAmount",to:"payableAmount"}]) },
    { label: "关联项目", fieldKey: "projectId", componentType: "cascadeSelect", required: true, sortOrder: 2, linkedTable: "projects", linkedLabelField: "name", linkedValueField: "id" },
    { label: "分包人员/单位", fieldKey: "vendorName", componentType: "input", required: true, sortOrder: 3, isReadonly: true },
    { label: "银行卡", fieldKey: "bankCard", componentType: "input", required: true, sortOrder: 4, isReadonly: true },
    { label: "开户行", fieldKey: "bankName", componentType: "input", required: true, sortOrder: 5, isReadonly: true },
    { label: "身份证号", fieldKey: "idNumber", componentType: "input", required: true, sortOrder: 6, isReadonly: true },
    { label: "电话", fieldKey: "phone", componentType: "input", required: true, sortOrder: 7, isReadonly: true },
    { label: "已付金额", fieldKey: "paidAmount", componentType: "number", required: false, sortOrder: 8, isReadonly: true },
    { label: "应付金额", fieldKey: "payableAmount", componentType: "number", required: false, sortOrder: 9, isReadonly: true },
    { label: "本次付款金额", fieldKey: "paymentAmount", componentType: "number", required: true, sortOrder: 10 },
    { label: "付款日期", fieldKey: "paymentDate", componentType: "date", required: true, sortOrder: 11 },
    { label: "附件", fieldKey: "attachmentUrl", componentType: "file", required: false, sortOrder: 12 },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: false, sortOrder: 13 },
  ]},
  // 11. 供应商档案
  { code: "suppliers", name: "供应商档案", fields: [
    { label: "供应商名称", fieldKey: "name", componentType: "input", required: true, sortOrder: 1 },
    { label: "联系人", fieldKey: "contact", componentType: "input", required: false, sortOrder: 2 },
    { label: "电话", fieldKey: "phone", componentType: "input", required: false, sortOrder: 3 },
    { label: "银行卡号", fieldKey: "bankAccount", componentType: "input", required: true, sortOrder: 4 },
    { label: "开户行", fieldKey: "bankName", componentType: "input", required: true, sortOrder: 5 },
    { label: "税号", fieldKey: "taxId", componentType: "input", required: false, sortOrder: 6 },
    { label: "地址", fieldKey: "address", componentType: "input", required: false, sortOrder: 7 },
    { label: "附件", fieldKey: "attachmentUrl", componentType: "file", required: false, sortOrder: 8 },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: false, sortOrder: 9 },
  ]},
  // 12. 劳务人员档案
  { code: "labor-workers", name: "劳务人员档案", fields: [
    { label: "姓名", fieldKey: "name", componentType: "input", required: true, sortOrder: 1 },
    { label: "电话", fieldKey: "phone", componentType: "input", required: false, sortOrder: 2 },
    { label: "身份证号", fieldKey: "idNumber", componentType: "input", required: false, sortOrder: 3 },
    { label: "银行卡号", fieldKey: "bankAccount", componentType: "input", required: true, sortOrder: 4 },
    { label: "开户行", fieldKey: "bankName", componentType: "input", required: true, sortOrder: 5 },
    { label: "地址", fieldKey: "address", componentType: "input", required: false, sortOrder: 6 },
    { label: "附件", fieldKey: "attachmentUrl", componentType: "file", required: false, sortOrder: 7 },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: false, sortOrder: 8 },
  ]},
  // 13. 项目合同变更
  { code: "project-contract-changes", name: "项目合同变更", fields: [
    { label: "项目合同名称", fieldKey: "contractId", componentType: "cascadeSelect", required: true, sortOrder: 1, linkedTable: "project-contracts", linkedLabelField: "name", linkedValueField: "id", linkedCopyFields: JSON.stringify([{from:"contractAmount",to:"originalAmount"}]) },
    { label: "变更日期", fieldKey: "changeDate", componentType: "date", required: true, sortOrder: 2 },
    { label: "增项金额", fieldKey: "increaseAmount", componentType: "number", required: true, sortOrder: 3 },
    { label: "合同原金额", fieldKey: "originalAmount", componentType: "number", required: true, sortOrder: 4, isReadonly: true },
    { label: "合同总金额", fieldKey: "totalAmount", componentType: "number", required: true, sortOrder: 5, computeFormula: "originalAmount + increaseAmount", isReadonly: true },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: true, sortOrder: 6 },
    { label: "附件", fieldKey: "attachmentUrl", componentType: "file", required: true, sortOrder: 7 },
  ]},
  // 14. 其他收款
  { code: "other-receipts", name: "其他收款", fields: [
    { label: "收款事由", fieldKey: "receiptType", componentType: "input", required: true, sortOrder: 1 },
    { label: "金额", fieldKey: "receiptAmount", componentType: "number", required: true, sortOrder: 2 },
    { label: "日期", fieldKey: "receiptDate", componentType: "date", required: true, sortOrder: 3 },
    { label: "关联项目", fieldKey: "projectId", componentType: "cascadeSelect", required: false, sortOrder: 4, linkedTable: "projects", linkedLabelField: "name", linkedValueField: "id" },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: true, sortOrder: 5 },
    { label: "附件", fieldKey: "attachmentUrl", componentType: "file", required: true, sortOrder: 6 },
  ]},
  // 15. 其他付款
  { code: "other-payments", name: "其他付款", fields: [
    { label: "付款事由", fieldKey: "paymentType", componentType: "input", required: true, sortOrder: 1 },
    { label: "金额", fieldKey: "paymentAmount", componentType: "number", required: true, sortOrder: 2 },
    { label: "日期", fieldKey: "paymentDate", componentType: "date", required: true, sortOrder: 3 },
    { label: "关联项目", fieldKey: "projectId", componentType: "cascadeSelect", required: false, sortOrder: 4, linkedTable: "projects", linkedLabelField: "name", linkedValueField: "id" },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: true, sortOrder: 5 },
    { label: "附件", fieldKey: "attachmentUrl", componentType: "file", required: true, sortOrder: 6 },
  ]},
  // 16. 项目费用报销
  { code: "project-expenses", name: "项目费用报销", fields: [
    { label: "关联项目", fieldKey: "projectId", componentType: "cascadeSelect", required: true, sortOrder: 1, linkedTable: "projects", linkedLabelField: "name", linkedValueField: "id" },
    { label: "报销人", fieldKey: "submitter", componentType: "input", required: true, sortOrder: 2 },
    { label: "总金额", fieldKey: "totalAmount", componentType: "number", required: true, sortOrder: 3, isReadonly: true, placeholder: "费用明细合计自动计算" },
    { label: "费用明细", fieldKey: "expenseItems", componentType: "table", required: false, sortOrder: 4, tableColumnsJson: JSON.stringify([{key:"type",label:"费用类别",componentType:"select",options:["材料","人工","其它"]},{key:"amount",label:"金额",componentType:"number"},{key:"attachmentUrl",label:"附件",componentType:"file"}]) },
    { label: "日期", fieldKey: "expenseDate", componentType: "date", required: true, sortOrder: 5 },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: false, sortOrder: 6 },
    { label: "附件", fieldKey: "attachmentUrl", componentType: "file", required: false, sortOrder: 7 },
  ]},
  // 17. 管理费用报销
  { code: "management-expenses", name: "管理费用报销", fields: [
    { label: "报销人", fieldKey: "submitter", componentType: "input", required: true, sortOrder: 1 },
    { label: "总金额", fieldKey: "totalAmount", componentType: "number", required: true, sortOrder: 2, isReadonly: true, placeholder: "费用明细合计自动计算" },
    { label: "费用明细", fieldKey: "expenseItems", componentType: "table", required: false, sortOrder: 3, tableColumnsJson: JSON.stringify([{key:"type",label:"费用类别",componentType:"select",options:["职工薪酬","办公费","交通费","员工福利","其他"]},{key:"amount",label:"金额",componentType:"number"},{key:"attachmentUrl",label:"附件",componentType:"file"}]) },
    { label: "日期", fieldKey: "expenseDate", componentType: "date", required: true, sortOrder: 4 },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: false, sortOrder: 5 },
    { label: "附件", fieldKey: "attachmentUrl", componentType: "file", required: false, sortOrder: 6 },
  ]},
  // 18. 销售费用报销
  { code: "sales-expenses", name: "销售费用报销", fields: [
    { label: "报销人", fieldKey: "submitter", componentType: "input", required: true, sortOrder: 1 },
    { label: "总金额", fieldKey: "totalAmount", componentType: "number", required: true, sortOrder: 2, isReadonly: true, placeholder: "费用明细合计自动计算" },
    { label: "费用明细", fieldKey: "expenseItems", componentType: "table", required: false, sortOrder: 3, tableColumnsJson: JSON.stringify([{key:"type",label:"费用类别",componentType:"select",options:["烟酒费","餐费","饭局","其他"]},{key:"amount",label:"金额",componentType:"number"},{key:"attachmentUrl",label:"附件",componentType:"file"}]) },
    { label: "日期", fieldKey: "expenseDate", componentType: "date", required: true, sortOrder: 4 },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: false, sortOrder: 5 },
    { label: "附件", fieldKey: "attachmentUrl", componentType: "file", required: false, sortOrder: 6 },
  ]},
  // 19. 备用金申请
  { code: "petty-cashes", name: "备用金申请", fields: [
    { label: "申请事由", fieldKey: "applyReason", componentType: "input", required: true, sortOrder: 1 },
    { label: "申请人", fieldKey: "holder", componentType: "input", required: true, sortOrder: 2 },
    { label: "金额", fieldKey: "issuedAmount", componentType: "number", required: true, sortOrder: 3 },
    { label: "关联项目", fieldKey: "projectId", componentType: "cascadeSelect", required: true, sortOrder: 4, linkedTable: "projects", linkedLabelField: "name", linkedValueField: "id" },
    { label: "日期", fieldKey: "issueDate", componentType: "date", required: true, sortOrder: 5 },
    { label: "备注", fieldKey: "remark", componentType: "textarea", required: false, sortOrder: 6 },
    { label: "附件", fieldKey: "attachmentUrl", componentType: "file", required: false, sortOrder: 7 },
  ]},
]

async function seedForms() {
  console.log('开始初始化表单定义...')
  let created = 0, updated = 0

  for (const formDef of FORMS) {
    const existing = await prisma.formDefinition.findUnique({ where: { code: formDef.code } })
    if (existing) {
      // 删除旧字段重建
      await prisma.formField.deleteMany({ where: { formId: existing.id } })
      await prisma.formField.createMany({
        data: formDef.fields.map((f) => buildFormFieldCreateManyInput(existing.id, f)),
      })
      await prisma.formDefinition.update({
        where: { id: existing.id },
        data: { name: formDef.name, updatedAt: new Date() },
      })
      console.log(`  ♻️  更新表单: ${formDef.name} (${formDef.code}) - ${formDef.fields.length} 个字段`)
      updated++
    } else {
      await prisma.formDefinition.create({
        data: {
          id: randomUUID(),
          code: formDef.code,
          name: formDef.name,
          isActive: true,
          updatedAt: new Date(),
          FormField: { create: formDef.fields.map((f) => buildFormFieldCreateInput(f)) },
        },
      })
      console.log(`  ✅ 创建表单: ${formDef.name} (${formDef.code}) - ${formDef.fields.length} 个字段`)
      created++
    }
  }

  console.log(`
🎉 完成! 创建 ${created} 个, 更新 ${updated} 个表单`)
}

seedForms()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
