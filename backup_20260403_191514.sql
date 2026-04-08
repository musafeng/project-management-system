--
-- PostgreSQL database dump
--

\restrict mXk66jD7u7FkYc91SlbUepdR7LF9h8FLbfMBczRxIGwGgGYs2HvB8Ydrfbjldpb

-- Dumped from database version 16.13 (Homebrew)
-- Dumped by pg_dump version 16.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ActionType; Type: TYPE; Schema: public; Owner: a1
--

CREATE TYPE public."ActionType" AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE'
);


ALTER TYPE public."ActionType" OWNER TO a1;

--
-- Name: ChangeType; Type: TYPE; Schema: public; Owner: a1
--

CREATE TYPE public."ChangeType" AS ENUM (
    'INCREASE',
    'DECREASE',
    'ADJUSTMENT'
);


ALTER TYPE public."ChangeType" OWNER TO a1;

--
-- Name: ContractStatus; Type: TYPE; Schema: public; Owner: a1
--

CREATE TYPE public."ContractStatus" AS ENUM (
    'DRAFT',
    'PENDING',
    'APPROVED',
    'EXECUTING',
    'COMPLETED',
    'TERMINATED',
    'CANCELLED'
);


ALTER TYPE public."ContractStatus" OWNER TO a1;

--
-- Name: ExpenseCategory; Type: TYPE; Schema: public; Owner: a1
--

CREATE TYPE public."ExpenseCategory" AS ENUM (
    'MATERIAL',
    'LABOR',
    'EQUIPMENT',
    'SUBCONTRACT',
    'MANAGEMENT',
    'OTHER'
);


ALTER TYPE public."ExpenseCategory" OWNER TO a1;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: a1
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'UNPAID',
    'PARTIAL',
    'PAID',
    'OVERPAID'
);


ALTER TYPE public."PaymentStatus" OWNER TO a1;

--
-- Name: PettyCashStatus; Type: TYPE; Schema: public; Owner: a1
--

CREATE TYPE public."PettyCashStatus" AS ENUM (
    'ISSUED',
    'RETURNED',
    'PARTIAL'
);


ALTER TYPE public."PettyCashStatus" OWNER TO a1;

--
-- Name: ProcessInstanceStatus; Type: TYPE; Schema: public; Owner: a1
--

CREATE TYPE public."ProcessInstanceStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


ALTER TYPE public."ProcessInstanceStatus" OWNER TO a1;

--
-- Name: ProcessNodeApproverType; Type: TYPE; Schema: public; Owner: a1
--

CREATE TYPE public."ProcessNodeApproverType" AS ENUM (
    'ROLE',
    'USER'
);


ALTER TYPE public."ProcessNodeApproverType" OWNER TO a1;

--
-- Name: ProcessNodeCcMode; Type: TYPE; Schema: public; Owner: a1
--

CREATE TYPE public."ProcessNodeCcMode" AS ENUM (
    'NONE',
    'SUBMITTER',
    'ROLE',
    'USER'
);


ALTER TYPE public."ProcessNodeCcMode" OWNER TO a1;

--
-- Name: ProcessTaskStatus; Type: TYPE; Schema: public; Owner: a1
--

CREATE TYPE public."ProcessTaskStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'SKIPPED'
);


ALTER TYPE public."ProcessTaskStatus" OWNER TO a1;

--
-- Name: ProjectStatus; Type: TYPE; Schema: public; Owner: a1
--

CREATE TYPE public."ProjectStatus" AS ENUM (
    'PLANNING',
    'APPROVED',
    'IN_PROGRESS',
    'SUSPENDED',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."ProjectStatus" OWNER TO a1;

--
-- Name: ReceiptStatus; Type: TYPE; Schema: public; Owner: a1
--

CREATE TYPE public."ReceiptStatus" AS ENUM (
    'UNRECEIVED',
    'PARTIAL',
    'RECEIVED',
    'OVERRECEIVED'
);


ALTER TYPE public."ReceiptStatus" OWNER TO a1;

--
-- Name: SystemUserRole; Type: TYPE; Schema: public; Owner: a1
--

CREATE TYPE public."SystemUserRole" AS ENUM (
    'ADMIN',
    'FINANCE',
    'PURCHASE',
    'PROJECT_MANAGER',
    'STAFF'
);


ALTER TYPE public."SystemUserRole" OWNER TO a1;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ActionLog; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."ActionLog" (
    id text NOT NULL,
    "userId" text,
    "userName" text NOT NULL,
    "userRole" text NOT NULL,
    action public."ActionType" NOT NULL,
    resource text NOT NULL,
    "resourceId" text,
    method text NOT NULL,
    path text NOT NULL,
    detail text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ActionLog" OWNER TO a1;

--
-- Name: ConstructionApproval; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."ConstructionApproval" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "contractId" text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    budget numeric(18,2) NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "approvalStatus" text DEFAULT 'APPROVED'::text NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "approvedAt" timestamp(3) without time zone,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "regionId" text,
    "formDataJson" text
);


ALTER TABLE public."ConstructionApproval" OWNER TO a1;

--
-- Name: ContractReceipt; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."ContractReceipt" (
    id text NOT NULL,
    "contractId" text NOT NULL,
    "receiptDate" timestamp(3) without time zone NOT NULL,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "receiptAmount" numeric(18,2) NOT NULL,
    "receiptMethod" text,
    "receiptNumber" text,
    status public."ReceiptStatus" DEFAULT 'UNRECEIVED'::public."ReceiptStatus" NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "regionId" text,
    "approvalStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "attachmentUrl" text,
    "deductionItems" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "submittedAt" timestamp(3) without time zone
);


ALTER TABLE public."ContractReceipt" OWNER TO a1;

--
-- Name: Customer; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."Customer" (
    id text NOT NULL,
    name text NOT NULL,
    contact text,
    phone text,
    email text,
    address text,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "bankAccount" text,
    "bankName" text,
    code text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    "taxId" text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Customer" OWNER TO a1;

--
-- Name: FormDefinition; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."FormDefinition" (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FormDefinition" OWNER TO a1;

--
-- Name: FormField; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."FormField" (
    id text NOT NULL,
    "formId" text NOT NULL,
    label text NOT NULL,
    "fieldKey" text NOT NULL,
    "componentType" text NOT NULL,
    required boolean DEFAULT false NOT NULL,
    "optionsJson" text,
    "sortOrder" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "computeFormula" text,
    "dependsOn" text,
    "dependsValue" text,
    "isReadonly" boolean DEFAULT false NOT NULL,
    "linkedCopyFields" text,
    "linkedLabelField" text,
    "linkedTable" text,
    "linkedValueField" text,
    placeholder text,
    "tableColumnsJson" text
);


ALTER TABLE public."FormField" OWNER TO a1;

--
-- Name: LaborContract; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."LaborContract" (
    id text NOT NULL,
    "constructionId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "signDate" timestamp(3) without time zone,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvalStatus" text DEFAULT 'APPROVED'::text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "changedAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "contractAmount" numeric(18,2) NOT NULL,
    "endDate" timestamp(3) without time zone,
    "paidAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "payableAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "projectId" text NOT NULL,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "startDate" timestamp(3) without time zone,
    "submittedAt" timestamp(3) without time zone,
    "unpaidAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "workerId" text NOT NULL,
    status public."ContractStatus" DEFAULT 'DRAFT'::public."ContractStatus" NOT NULL,
    "regionId" text,
    "attachmentUrl" text,
    "laborType" text
);


ALTER TABLE public."LaborContract" OWNER TO a1;

--
-- Name: LaborPayment; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."LaborPayment" (
    id text NOT NULL,
    "contractId" text NOT NULL,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvalStatus" text DEFAULT 'APPROVED'::text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "paymentAmount" numeric(18,2) NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    "paymentMethod" text,
    "paymentNumber" text,
    "projectId" text NOT NULL,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    status public."PaymentStatus" DEFAULT 'UNPAID'::public."PaymentStatus" NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "workerId" text NOT NULL,
    "regionId" text
);


ALTER TABLE public."LaborPayment" OWNER TO a1;

--
-- Name: LaborWorker; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."LaborWorker" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "idNumber" text,
    phone text,
    address text,
    "bankAccount" text,
    "bankName" text,
    status text DEFAULT 'active'::text NOT NULL,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "attachmentUrl" text
);


ALTER TABLE public."LaborWorker" OWNER TO a1;

--
-- Name: ManagementExpense; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."ManagementExpense" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    category text NOT NULL,
    "expenseDate" timestamp(3) without time zone NOT NULL,
    description text,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expenseAmount" numeric(18,2) NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "approvalStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "attachmentUrl" text,
    "expenseItems" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "submittedAt" timestamp(3) without time zone,
    submitter text,
    "totalAmount" numeric(18,2)
);


ALTER TABLE public."ManagementExpense" OWNER TO a1;

--
-- Name: OrganizationUnit; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."OrganizationUnit" (
    id text NOT NULL,
    name text NOT NULL,
    code text,
    "parentId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."OrganizationUnit" OWNER TO a1;

--
-- Name: OtherPayment; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."OtherPayment" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "paymentType" text NOT NULL,
    "paymentAmount" numeric(18,2) NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    "paymentMethod" text,
    "paymentNumber" text,
    status public."PaymentStatus" DEFAULT 'UNPAID'::public."PaymentStatus" NOT NULL,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "approvalStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "attachmentUrl" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "submittedAt" timestamp(3) without time zone
);


ALTER TABLE public."OtherPayment" OWNER TO a1;

--
-- Name: OtherReceipt; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."OtherReceipt" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "receiptType" text NOT NULL,
    "receiptAmount" numeric(18,2) NOT NULL,
    "receiptDate" timestamp(3) without time zone NOT NULL,
    "receiptMethod" text,
    "receiptNumber" text,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "approvalStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "attachmentUrl" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "submittedAt" timestamp(3) without time zone
);


ALTER TABLE public."OtherReceipt" OWNER TO a1;

--
-- Name: PettyCash; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."PettyCash" (
    id text NOT NULL,
    holder text NOT NULL,
    "issueDate" timestamp(3) without time zone NOT NULL,
    "returnDate" timestamp(3) without time zone,
    description text,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "issuedAmount" numeric(18,2) NOT NULL,
    "projectId" text NOT NULL,
    "returnedAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    status public."PettyCashStatus" DEFAULT 'ISSUED'::public."PettyCashStatus" NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "applyReason" text,
    "approvalStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "attachmentUrl" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "submittedAt" timestamp(3) without time zone
);


ALTER TABLE public."PettyCash" OWNER TO a1;

--
-- Name: ProcessDefinition; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."ProcessDefinition" (
    id text NOT NULL,
    "resourceType" text NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProcessDefinition" OWNER TO a1;

--
-- Name: ProcessInstance; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."ProcessInstance" (
    id text NOT NULL,
    "definitionId" text NOT NULL,
    "resourceType" text NOT NULL,
    "resourceId" text NOT NULL,
    "submitterUserId" text NOT NULL,
    "submitterName" text NOT NULL,
    status public."ProcessInstanceStatus" DEFAULT 'PENDING'::public."ProcessInstanceStatus" NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "finishedAt" timestamp(3) without time zone
);


ALTER TABLE public."ProcessInstance" OWNER TO a1;

--
-- Name: ProcessNode; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."ProcessNode" (
    id text NOT NULL,
    "definitionId" text NOT NULL,
    "order" integer NOT NULL,
    name text DEFAULT '审批'::text NOT NULL,
    "approverType" public."ProcessNodeApproverType" DEFAULT 'ROLE'::public."ProcessNodeApproverType" NOT NULL,
    "approverRole" text,
    "approverUserId" text,
    "ccMode" public."ProcessNodeCcMode" DEFAULT 'NONE'::public."ProcessNodeCcMode" NOT NULL,
    "ccRole" text,
    "ccUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProcessNode" OWNER TO a1;

--
-- Name: ProcessTask; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."ProcessTask" (
    id text NOT NULL,
    "instanceId" text NOT NULL,
    "nodeId" text NOT NULL,
    "nodeOrder" integer NOT NULL,
    "approverType" public."ProcessNodeApproverType" NOT NULL,
    "approverRole" text,
    "approverUserId" text,
    status public."ProcessTaskStatus" DEFAULT 'PENDING'::public."ProcessTaskStatus" NOT NULL,
    comment text,
    "handledAt" timestamp(3) without time zone,
    "handledBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ProcessTask" OWNER TO a1;

--
-- Name: ProcurementContract; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."ProcurementContract" (
    id text NOT NULL,
    "constructionId" text NOT NULL,
    "supplierId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "signDate" timestamp(3) without time zone,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvalStatus" text DEFAULT 'APPROVED'::text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "changedAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "contractAmount" numeric(18,2) NOT NULL,
    "endDate" timestamp(3) without time zone,
    "paidAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "payableAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "projectId" text NOT NULL,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "startDate" timestamp(3) without time zone,
    "submittedAt" timestamp(3) without time zone,
    "unpaidAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    status public."ContractStatus" DEFAULT 'DRAFT'::public."ContractStatus" NOT NULL,
    "regionId" text,
    "attachmentUrl" text,
    "materialCategory" text
);


ALTER TABLE public."ProcurementContract" OWNER TO a1;

--
-- Name: ProcurementPayment; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."ProcurementPayment" (
    id text NOT NULL,
    "contractId" text NOT NULL,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvalStatus" text DEFAULT 'APPROVED'::text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "paymentAmount" numeric(18,2) NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    "paymentMethod" text,
    "paymentNumber" text,
    "projectId" text NOT NULL,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    status public."PaymentStatus" DEFAULT 'UNPAID'::public."PaymentStatus" NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "regionId" text
);


ALTER TABLE public."ProcurementPayment" OWNER TO a1;

--
-- Name: Project; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "customerId" text NOT NULL,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    budget numeric(18,2) NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    status public."ProjectStatus" DEFAULT 'IN_PROGRESS'::public."ProjectStatus" NOT NULL,
    "regionId" text,
    area numeric(18,2),
    "bidMethod" text,
    location text,
    "projectType" text
);


ALTER TABLE public."Project" OWNER TO a1;

--
-- Name: ProjectContract; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."ProjectContract" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "signDate" timestamp(3) without time zone,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "changedAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "contractAmount" numeric(18,2) NOT NULL,
    "customerId" text NOT NULL,
    "endDate" timestamp(3) without time zone,
    "receivableAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "receivedAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "startDate" timestamp(3) without time zone,
    "unreceivedAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    status public."ContractStatus" DEFAULT 'DRAFT'::public."ContractStatus" NOT NULL,
    "regionId" text,
    "attachmentUrl" text,
    "contractType" text,
    "hasRetention" boolean DEFAULT false NOT NULL,
    "paymentMethod" text,
    "retentionAmount" numeric(18,2),
    "retentionRate" numeric(5,2)
);


ALTER TABLE public."ProjectContract" OWNER TO a1;

--
-- Name: ProjectContractChange; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."ProjectContractChange" (
    id text NOT NULL,
    "contractId" text NOT NULL,
    "changeType" public."ChangeType" NOT NULL,
    "changeAmount" numeric(18,2) NOT NULL,
    "changeReason" text,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "approvalStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "attachmentUrl" text,
    "changeDate" timestamp(3) without time zone,
    "increaseAmount" numeric(18,2),
    "originalAmount" numeric(18,2),
    "rejectedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "submittedAt" timestamp(3) without time zone,
    "totalAmount" numeric(18,2)
);


ALTER TABLE public."ProjectContractChange" OWNER TO a1;

--
-- Name: ProjectExpense; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."ProjectExpense" (
    id text NOT NULL,
    "expenseDate" timestamp(3) without time zone NOT NULL,
    description text,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expenseAmount" numeric(18,2) NOT NULL,
    "projectId" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    category public."ExpenseCategory" NOT NULL,
    "approvalStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "attachmentUrl" text,
    "expenseItems" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "submittedAt" timestamp(3) without time zone,
    submitter text,
    "totalAmount" numeric(18,2)
);


ALTER TABLE public."ProjectExpense" OWNER TO a1;

--
-- Name: ProjectStatusChange; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."ProjectStatusChange" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "fromStatus" public."ProjectStatus" NOT NULL,
    "toStatus" public."ProjectStatus" NOT NULL,
    "changeReason" text,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProjectStatusChange" OWNER TO a1;

--
-- Name: Region; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."Region" (
    id text NOT NULL,
    name text NOT NULL,
    code text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Region" OWNER TO a1;

--
-- Name: SalesExpense; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."SalesExpense" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    category text NOT NULL,
    "expenseDate" timestamp(3) without time zone NOT NULL,
    description text,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expenseAmount" numeric(18,2) NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "approvalStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "attachmentUrl" text,
    "expenseItems" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "submittedAt" timestamp(3) without time zone,
    submitter text,
    "totalAmount" numeric(18,2)
);


ALTER TABLE public."SalesExpense" OWNER TO a1;

--
-- Name: SubcontractContract; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."SubcontractContract" (
    id text NOT NULL,
    "constructionId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "signDate" timestamp(3) without time zone,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvalStatus" text DEFAULT 'APPROVED'::text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "changedAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "contractAmount" numeric(18,2) NOT NULL,
    "endDate" timestamp(3) without time zone,
    "paidAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "payableAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "projectId" text NOT NULL,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "startDate" timestamp(3) without time zone,
    "submittedAt" timestamp(3) without time zone,
    "unpaidAmount" numeric(18,2) DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "vendorId" text NOT NULL,
    status public."ContractStatus" DEFAULT 'DRAFT'::public."ContractStatus" NOT NULL,
    "regionId" text,
    "attachmentUrl" text,
    "subcontractType" text
);


ALTER TABLE public."SubcontractContract" OWNER TO a1;

--
-- Name: SubcontractPayment; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."SubcontractPayment" (
    id text NOT NULL,
    "contractId" text NOT NULL,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvalStatus" text DEFAULT 'APPROVED'::text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "paymentAmount" numeric(18,2) NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    "paymentMethod" text,
    "paymentNumber" text,
    "projectId" text NOT NULL,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    status public."PaymentStatus" DEFAULT 'UNPAID'::public."PaymentStatus" NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "vendorId" text NOT NULL,
    "regionId" text
);


ALTER TABLE public."SubcontractPayment" OWNER TO a1;

--
-- Name: SubcontractVendor; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."SubcontractVendor" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    contact text,
    phone text,
    email text,
    address text,
    "taxId" text,
    "bankAccount" text,
    "bankName" text,
    status text DEFAULT 'active'::text NOT NULL,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SubcontractVendor" OWNER TO a1;

--
-- Name: Supplier; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."Supplier" (
    id text NOT NULL,
    name text NOT NULL,
    contact text,
    phone text,
    email text,
    address text,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "bankAccount" text,
    "bankName" text,
    code text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    "taxId" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "attachmentUrl" text
);


ALTER TABLE public."Supplier" OWNER TO a1;

--
-- Name: SystemUser; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."SystemUser" (
    id text NOT NULL,
    "dingUserId" text NOT NULL,
    name text NOT NULL,
    mobile text,
    unionid text,
    role public."SystemUserRole" DEFAULT 'STAFF'::public."SystemUserRole" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "deptIdsJson" text,
    "deptNamesJson" text,
    "lastLoginAt" timestamp(3) without time zone,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SystemUser" OWNER TO a1;

--
-- Name: SystemUserOrgUnit; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public."SystemUserOrgUnit" (
    id text NOT NULL,
    "systemUserId" text NOT NULL,
    "orgUnitId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SystemUserOrgUnit" OWNER TO a1;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: a1
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO a1;

--
-- Data for Name: ActionLog; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."ActionLog" (id, "userId", "userName", "userRole", action, resource, "resourceId", method, path, detail, "createdAt") FROM stdin;
\.


--
-- Data for Name: ConstructionApproval; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."ConstructionApproval" (id, "projectId", "contractId", code, name, budget, status, "startDate", "endDate", "approvalStatus", "submittedAt", "approvedAt", "rejectedAt", "rejectedReason", remark, "createdAt", "updatedAt", "regionId", "formDataJson") FROM stdin;
\.


--
-- Data for Name: ContractReceipt; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."ContractReceipt" (id, "contractId", "receiptDate", remark, "createdAt", "receiptAmount", "receiptMethod", "receiptNumber", status, "updatedAt", "regionId", "approvalStatus", "approvedAt", "attachmentUrl", "deductionItems", "rejectedAt", "rejectedReason", "submittedAt") FROM stdin;
\.


--
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."Customer" (id, name, contact, phone, email, address, remark, "createdAt", "bankAccount", "bankName", code, status, "taxId", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FormDefinition; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."FormDefinition" (id, name, code, "isActive", "createdAt", "updatedAt") FROM stdin;
cmnfpa0g00000xojsuvof1iji	项目新增	projects	t	2026-04-01 07:04:14.017	2026-04-01 07:04:14.017
cmnfpa0ge000axojsie8dfca5	项目合同	project-contracts	t	2026-04-01 07:04:14.031	2026-04-01 07:04:14.031
cmnfpa0gk000rxojs9acdx0jq	项目合同收款	contract-receipts	t	2026-04-01 07:04:14.036	2026-04-01 07:04:14.036
cmnfpa0gn000zxojsyrmsoa3t	施工立项	construction-approvals	t	2026-04-01 07:04:14.04	2026-04-01 07:04:14.04
cmnfpa0gs0016xojsq4jgrxig	采购合同	procurement-contracts	t	2026-04-01 07:04:14.044	2026-04-01 07:04:14.044
cmnfpa0gw001ixojsbmdix6jh	采购付款	procurement-payments	t	2026-04-01 07:04:14.049	2026-04-01 07:04:14.049
cmnfpa0h1001vxojsp0k5u7lh	劳务合同	labor-contracts	t	2026-04-01 07:04:14.053	2026-04-01 07:04:14.053
cmnfpa0h50027xojsfjxmvwvk	劳务付款	labor-payments	t	2026-04-01 07:04:14.057	2026-04-01 07:04:14.057
cmnfpa0h9002lxojs4jsot7pl	分包合同	subcontract-contracts	t	2026-04-01 07:04:14.062	2026-04-01 07:04:14.062
cmnfpa0hd002wxojsrqpzmw12	分包付款	subcontract-payments	t	2026-04-01 07:04:14.065	2026-04-01 07:04:14.065
cmnfpa0hh003axojs6py73ilm	供应商档案	suppliers	t	2026-04-01 07:04:14.07	2026-04-01 07:04:14.07
cmnfpa0hl003kxojssa65ih2w	劳务人员档案	labor-workers	t	2026-04-01 07:04:14.074	2026-04-01 07:04:14.074
cmnfpa0hp003txojsau8tzl1r	项目合同变更	project-contract-changes	t	2026-04-01 07:04:14.078	2026-04-01 07:04:14.078
cmnfpa0ht0041xojsf3y0vsl8	其他收款	other-receipts	t	2026-04-01 07:04:14.081	2026-04-01 07:04:14.081
cmnfpa0hw0048xojs1puidrhw	其他付款	other-payments	t	2026-04-01 07:04:14.084	2026-04-01 07:04:14.084
cmnfpa0hz004fxojs98b5jcoq	项目费用报销	project-expenses	t	2026-04-01 07:04:14.088	2026-04-01 07:04:14.088
cmnfpa0i3004nxojsh2293ace	管理费用报销	management-expenses	t	2026-04-01 07:04:14.092	2026-04-01 07:04:14.092
cmnfpa0i7004uxojsd7mqr2l0	销售费用报销	sales-expenses	t	2026-04-01 07:04:14.095	2026-04-01 07:04:14.095
cmnfpa0ia0051xojslnvh95xd	备用金申请	petty-cashes	t	2026-04-01 07:04:14.099	2026-04-01 07:04:14.099
\.


--
-- Data for Name: FormField; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."FormField" (id, "formId", label, "fieldKey", "componentType", required, "optionsJson", "sortOrder", "createdAt", "computeFormula", "dependsOn", "dependsValue", "isReadonly", "linkedCopyFields", "linkedLabelField", "linkedTable", "linkedValueField", placeholder, "tableColumnsJson") FROM stdin;
cmnfpa0g20001xojsun7oet2e	cmnfpa0g00000xojsuvof1iji	项目名称	name	input	t	\N	1	2026-04-01 07:04:14.017	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0g20002xojsd448bwz9	cmnfpa0g00000xojsuvof1iji	客户名称	customerId	cascadeSelect	t	\N	2	2026-04-01 07:04:14.017	\N	\N	\N	f	\N	name	customers	id	\N	\N
cmnfpa0g20003xojsnv7896va	cmnfpa0g00000xojsuvof1iji	项目地点	location	input	t	\N	3	2026-04-01 07:04:14.017	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0g20004xojspzz38x7d	cmnfpa0g00000xojsuvof1iji	项目类型	projectType	select	t	["装修","广告","采购","设计","其他"]	4	2026-04-01 07:04:14.017	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0g20005xojswjf468q7	cmnfpa0g00000xojsuvof1iji	招标方式	bidMethod	select	t	["公开招标","阳光平台","不招标"]	5	2026-04-01 07:04:14.017	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0g20006xojs1y2pcuwu	cmnfpa0g00000xojsuvof1iji	项目面积(㎡)	area	number	f	\N	6	2026-04-01 07:04:14.017	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0g20007xojsifxmvju0	cmnfpa0g00000xojsuvof1iji	预算金额	budget	number	t	\N	7	2026-04-01 07:04:14.017	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0g20008xojs263wamoj	cmnfpa0g00000xojsuvof1iji	开始日期	startDate	date	f	\N	8	2026-04-01 07:04:14.017	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0g20009xojszkc0alul	cmnfpa0g00000xojsuvof1iji	备注	remark	textarea	f	\N	9	2026-04-01 07:04:14.017	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gf000bxojs6jmcsjn0	cmnfpa0ge000axojsie8dfca5	合同名称	name	input	t	\N	1	2026-04-01 07:04:14.031	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gf000cxojs3ws6urf7	cmnfpa0ge000axojsie8dfca5	关联项目	projectId	cascadeSelect	t	\N	2	2026-04-01 07:04:14.031	\N	\N	\N	f	\N	name	projects	id	\N	\N
cmnfpa0gf000dxojsumpeo82k	cmnfpa0ge000axojsie8dfca5	客户名称	customerId	cascadeSelect	t	\N	3	2026-04-01 07:04:14.031	\N	\N	\N	f	\N	name	customers	id	\N	\N
cmnfpa0gf000exojslkddk76f	cmnfpa0ge000axojsie8dfca5	合同金额	contractAmount	number	t	\N	4	2026-04-01 07:04:14.031	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gf000fxojsztx9dhub	cmnfpa0ge000axojsie8dfca5	合同类型	contractType	select	t	["固定总价","固定单价","可变总价","可变单价"]	5	2026-04-01 07:04:14.031	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gf000gxojs1zo47meh	cmnfpa0ge000axojsie8dfca5	签订日期	signDate	date	f	\N	6	2026-04-01 07:04:14.031	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gf000hxojsg0t4uim6	cmnfpa0ge000axojsie8dfca5	开工日期	startDate	date	t	\N	7	2026-04-01 07:04:14.031	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gf000ixojs2n9gs6up	cmnfpa0ge000axojsie8dfca5	竣工日期	endDate	date	f	\N	8	2026-04-01 07:04:14.031	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gf000jxojsashp7fgy	cmnfpa0ge000axojsie8dfca5	付款方式	paymentMethod	select	t	["按进度","按合同","其他"]	9	2026-04-01 07:04:14.031	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gf000kxojsiilwonb6	cmnfpa0ge000axojsie8dfca5	有无质保金	hasRetention	select	t	["有","无"]	10	2026-04-01 07:04:14.031	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gf000lxojso1f62n3y	cmnfpa0ge000axojsie8dfca5	质保金比例(%)	retentionRate	number	f	\N	11	2026-04-01 07:04:14.031	\N	hasRetention	有	f	\N	\N	\N	\N	\N	\N
cmnfpa0gf000mxojs8istyyqv	cmnfpa0ge000axojsie8dfca5	质保金金额	retentionAmount	number	f	\N	12	2026-04-01 07:04:14.031	contractAmount * retentionRate / 100	hasRetention	有	t	\N	\N	\N	\N	\N	\N
cmnfpa0gf000nxojsh04ljhiu	cmnfpa0ge000axojsie8dfca5	已收金额	receivedAmount	number	f	\N	13	2026-04-01 07:04:14.031	\N	\N	\N	t	\N	\N	\N	\N	自动从收款记录汇总	\N
cmnfpa0gf000oxojse6e3yzgz	cmnfpa0ge000axojsie8dfca5	未收金额	unreceivedAmount	number	f	\N	14	2026-04-01 07:04:14.031	contractAmount - receivedAmount	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0gf000pxojs0an8n569	cmnfpa0ge000axojsie8dfca5	合同附件	attachmentUrl	file	f	\N	15	2026-04-01 07:04:14.031	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gf000qxojsduw1f4j9	cmnfpa0ge000axojsie8dfca5	备注	remark	textarea	f	\N	16	2026-04-01 07:04:14.031	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gk000sxojsbs0nikru	cmnfpa0gk000rxojs9acdx0jq	关联项目合同	contractId	cascadeSelect	t	\N	1	2026-04-01 07:04:14.036	\N	\N	\N	f	\N	name	project-contracts	id	\N	\N
cmnfpa0gk000txojsj2iqi3rz	cmnfpa0gk000rxojs9acdx0jq	收款金额	receiptAmount	number	t	\N	2	2026-04-01 07:04:14.036	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gk000uxojstyi9gr67	cmnfpa0gk000rxojs9acdx0jq	收款日期	receiptDate	date	t	\N	3	2026-04-01 07:04:14.036	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gk000vxojstx8itx6a	cmnfpa0gk000rxojs9acdx0jq	收款方式	receiptMethod	select	f	["转账","现金","支票","其他"]	4	2026-04-01 07:04:14.036	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gk000wxojsgaqpo8oo	cmnfpa0gk000rxojs9acdx0jq	费用明细扣款	deductionItems	table	f	\N	5	2026-04-01 07:04:14.036	\N	\N	\N	f	\N	\N	\N	\N	\N	[{"key":"type","label":"扣款类型","componentType":"select","options":["税金","手续费","管理费","其他"]},{"key":"amount","label":"金额","componentType":"number"}]
cmnfpa0gk000xxojs929trsv1	cmnfpa0gk000rxojs9acdx0jq	附件	attachmentUrl	file	f	\N	6	2026-04-01 07:04:14.036	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gk000yxojs2k2mlpsu	cmnfpa0gk000rxojs9acdx0jq	备注	remark	textarea	f	\N	7	2026-04-01 07:04:14.036	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gn0010xojswig1peak	cmnfpa0gn000zxojsyrmsoa3t	立项名称	name	input	t	\N	1	2026-04-01 07:04:14.04	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gn0011xojsa4dsbbtc	cmnfpa0gn000zxojsyrmsoa3t	关联项目	projectId	cascadeSelect	t	\N	2	2026-04-01 07:04:14.04	\N	\N	\N	f	\N	name	projects	id	\N	\N
cmnfpa0gn0012xojsgrog8lv7	cmnfpa0gn000zxojsyrmsoa3t	关联项目合同	contractId	cascadeSelect	t	\N	3	2026-04-01 07:04:14.04	\N	\N	\N	f	\N	name	project-contracts	id	\N	\N
cmnfpa0gn0013xojs6kxmldmd	cmnfpa0gn000zxojsyrmsoa3t	预算金额	budget	number	t	\N	4	2026-04-01 07:04:14.04	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gn0014xojs7suzwhcm	cmnfpa0gn000zxojsyrmsoa3t	开始日期	startDate	date	f	\N	5	2026-04-01 07:04:14.04	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gn0015xojsyqx8gy03	cmnfpa0gn000zxojsyrmsoa3t	备注	remark	textarea	f	\N	6	2026-04-01 07:04:14.04	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gs0017xojs7vv6lakp	cmnfpa0gs0016xojsq4jgrxig	采购合同名称	name	input	t	\N	1	2026-04-01 07:04:14.044	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gs0018xojsdngifr7r	cmnfpa0gs0016xojsq4jgrxig	关联施工立项	constructionId	cascadeSelect	t	\N	2	2026-04-01 07:04:14.044	\N	\N	\N	f	\N	name	construction-approvals	id	\N	\N
cmnfpa0gs0019xojs5gqestvy	cmnfpa0gs0016xojsq4jgrxig	关联项目	projectId	cascadeSelect	t	\N	3	2026-04-01 07:04:14.044	\N	\N	\N	f	\N	name	projects	id	\N	\N
cmnfpa0gs001axojsmk3wlm9t	cmnfpa0gs0016xojsq4jgrxig	供应商	supplierId	cascadeSelect	t	\N	4	2026-04-01 07:04:14.044	\N	\N	\N	f	\N	name	suppliers	id	\N	\N
cmnfpa0gs001bxojspvh4xo7w	cmnfpa0gs0016xojsq4jgrxig	材料类别	materialCategory	select	t	["油工材料","木工材料","瓦工材料","水电材料","其他杂项"]	5	2026-04-01 07:04:14.044	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gs001cxojs5y79blsl	cmnfpa0gs0016xojsq4jgrxig	合同金额	contractAmount	number	t	\N	6	2026-04-01 07:04:14.044	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gs001dxojs26bdfyl0	cmnfpa0gs0016xojsq4jgrxig	已付金额	paidAmount	number	f	\N	7	2026-04-01 07:04:14.044	\N	\N	\N	t	\N	\N	\N	\N	付款后自动更新	\N
cmnfpa0gs001exojs6wcy33kt	cmnfpa0gs0016xojsq4jgrxig	应付金额	payableAmount	number	f	\N	8	2026-04-01 07:04:14.044	\N	\N	\N	t	\N	\N	\N	\N	付款后自动更新	\N
cmnfpa0gs001fxojs3do0f773	cmnfpa0gs0016xojsq4jgrxig	签订日期	signDate	date	f	\N	9	2026-04-01 07:04:14.044	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gs001gxojsvs1xa1ud	cmnfpa0gs0016xojsq4jgrxig	附件	attachmentUrl	file	f	\N	10	2026-04-01 07:04:14.044	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gs001hxojsa475rhlm	cmnfpa0gs0016xojsq4jgrxig	备注	remark	textarea	f	\N	11	2026-04-01 07:04:14.044	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hd002yxojs32aol1eb	cmnfpa0hd002wxojsrqpzmw12	关联项目	projectId	cascadeSelect	t	\N	2	2026-04-01 07:04:14.065	\N	\N	\N	f	\N	name	projects	id	\N	\N
cmnfpa0gw001jxojsegizsqd4	cmnfpa0gw001ixojsbmdix6jh	采购合同名称	contractId	cascadeSelect	t	\N	1	2026-04-01 07:04:14.049	\N	\N	\N	f	[{"from":"supplier.name","to":"supplierName"},{"from":"supplier.bankAccount","to":"bankCard"},{"from":"supplier.bankName","to":"bankName"},{"from":"supplier.phone","to":"phone"},{"from":"paidAmount","to":"paidAmount"},{"from":"payableAmount","to":"payableAmount"}]	name	procurement-contracts	id	\N	\N
cmnfpa0gw001kxojsicxsnpyv	cmnfpa0gw001ixojsbmdix6jh	关联项目	projectId	cascadeSelect	t	\N	2	2026-04-01 07:04:14.049	\N	\N	\N	f	\N	name	projects	id	\N	\N
cmnfpa0gw001lxojs7eiz0wb9	cmnfpa0gw001ixojsbmdix6jh	供应商名称	supplierName	input	t	\N	3	2026-04-01 07:04:14.049	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0gw001mxojsmv5qwlct	cmnfpa0gw001ixojsbmdix6jh	银行卡	bankCard	input	t	\N	4	2026-04-01 07:04:14.049	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0gw001nxojs0jqgomai	cmnfpa0gw001ixojsbmdix6jh	开户行	bankName	input	t	\N	5	2026-04-01 07:04:14.049	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0gw001oxojs6hd9tqbj	cmnfpa0gw001ixojsbmdix6jh	电话	phone	input	t	\N	6	2026-04-01 07:04:14.049	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0gw001pxojswopft7cg	cmnfpa0gw001ixojsbmdix6jh	已付金额	paidAmount	number	f	\N	7	2026-04-01 07:04:14.049	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0gw001qxojs45qwjyns	cmnfpa0gw001ixojsbmdix6jh	应付金额	payableAmount	number	f	\N	8	2026-04-01 07:04:14.049	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0gw001rxojsga01c67s	cmnfpa0gw001ixojsbmdix6jh	本次付款金额	paymentAmount	number	t	\N	9	2026-04-01 07:04:14.049	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gw001sxojsft948q9v	cmnfpa0gw001ixojsbmdix6jh	付款日期	paymentDate	date	t	\N	10	2026-04-01 07:04:14.049	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gw001txojs793nn4qs	cmnfpa0gw001ixojsbmdix6jh	附件	attachmentUrl	file	f	\N	11	2026-04-01 07:04:14.049	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0gw001uxojs6uw3y15l	cmnfpa0gw001ixojsbmdix6jh	备注	remark	textarea	f	\N	12	2026-04-01 07:04:14.049	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0h1001wxojss1wkxyhd	cmnfpa0h1001vxojsp0k5u7lh	劳务合同名称	name	input	t	\N	1	2026-04-01 07:04:14.053	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0h1001xxojsovcrrs91	cmnfpa0h1001vxojsp0k5u7lh	关联项目	projectId	cascadeSelect	t	\N	2	2026-04-01 07:04:14.053	\N	\N	\N	f	\N	name	projects	id	\N	\N
cmnfpa0h1001yxojsjvgltftd	cmnfpa0h1001vxojsp0k5u7lh	关联施工立项	constructionId	cascadeSelect	t	\N	3	2026-04-01 07:04:14.053	\N	\N	\N	f	\N	name	construction-approvals	id	\N	\N
cmnfpa0h1001zxojsu7g21f5s	cmnfpa0h1001vxojsp0k5u7lh	劳务人员	workerId	cascadeSelect	t	\N	4	2026-04-01 07:04:14.053	\N	\N	\N	f	\N	name	labor-workers	id	\N	\N
cmnfpa0h10020xojshcagnopd	cmnfpa0h1001vxojsp0k5u7lh	劳务类型	laborType	select	t	["腻子工","瓦工","木工","油工","零工","其它"]	5	2026-04-01 07:04:14.053	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0h10021xojsoi6lkyhb	cmnfpa0h1001vxojsp0k5u7lh	合同金额	contractAmount	number	t	\N	6	2026-04-01 07:04:14.053	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0h10022xojshvjvohz0	cmnfpa0h1001vxojsp0k5u7lh	已付金额	paidAmount	number	f	\N	7	2026-04-01 07:04:14.053	\N	\N	\N	t	\N	\N	\N	\N	付款后自动更新	\N
cmnfpa0h10023xojsnuhsjmni	cmnfpa0h1001vxojsp0k5u7lh	应付金额	payableAmount	number	f	\N	8	2026-04-01 07:04:14.053	\N	\N	\N	t	\N	\N	\N	\N	付款后自动更新	\N
cmnfpa0h10024xojsusy9apg3	cmnfpa0h1001vxojsp0k5u7lh	签订日期	signDate	date	f	\N	9	2026-04-01 07:04:14.053	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0h10025xojszet03oaj	cmnfpa0h1001vxojsp0k5u7lh	附件	attachmentUrl	file	f	\N	10	2026-04-01 07:04:14.053	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0h10026xojsbyhspmly	cmnfpa0h1001vxojsp0k5u7lh	备注	remark	textarea	f	\N	11	2026-04-01 07:04:14.053	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0h50028xojsl87q97nt	cmnfpa0h50027xojsfjxmvwvk	劳务合同名称	contractId	cascadeSelect	t	\N	1	2026-04-01 07:04:14.057	\N	\N	\N	f	[{"from":"worker.name","to":"workerName"},{"from":"worker.bankAccount","to":"bankCard"},{"from":"worker.bankName","to":"bankName"},{"from":"worker.idNumber","to":"idNumber"},{"from":"worker.phone","to":"phone"},{"from":"paidAmount","to":"paidAmount"},{"from":"payableAmount","to":"payableAmount"}]	name	labor-contracts	id	\N	\N
cmnfpa0h50029xojsi31sn3ie	cmnfpa0h50027xojsfjxmvwvk	关联项目	projectId	cascadeSelect	t	\N	2	2026-04-01 07:04:14.057	\N	\N	\N	f	\N	name	projects	id	\N	\N
cmnfpa0h5002axojs5hlpswn9	cmnfpa0h50027xojsfjxmvwvk	劳务人员姓名	workerName	input	t	\N	3	2026-04-01 07:04:14.057	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0h5002bxojs1l2smgrr	cmnfpa0h50027xojsfjxmvwvk	银行卡	bankCard	input	t	\N	4	2026-04-01 07:04:14.057	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0h5002cxojs4371z7l0	cmnfpa0h50027xojsfjxmvwvk	开户行	bankName	input	t	\N	5	2026-04-01 07:04:14.057	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0h5002dxojs7r4z0r65	cmnfpa0h50027xojsfjxmvwvk	身份证号	idNumber	input	t	\N	6	2026-04-01 07:04:14.057	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0h5002exojs95s9275g	cmnfpa0h50027xojsfjxmvwvk	电话	phone	input	t	\N	7	2026-04-01 07:04:14.057	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0h5002fxojs6izdabn0	cmnfpa0h50027xojsfjxmvwvk	已付金额	paidAmount	number	f	\N	8	2026-04-01 07:04:14.057	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0h5002gxojsqz4apx7h	cmnfpa0h50027xojsfjxmvwvk	应付金额	payableAmount	number	f	\N	9	2026-04-01 07:04:14.057	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0h5002hxojs1p776nvc	cmnfpa0h50027xojsfjxmvwvk	本次付款金额	paymentAmount	number	t	\N	10	2026-04-01 07:04:14.057	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0h5002ixojs6v1aew6c	cmnfpa0h50027xojsfjxmvwvk	付款日期	paymentDate	date	t	\N	11	2026-04-01 07:04:14.057	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0h5002jxojsocv088us	cmnfpa0h50027xojsfjxmvwvk	附件	attachmentUrl	file	f	\N	12	2026-04-01 07:04:14.057	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0h5002kxojsdogfwt26	cmnfpa0h50027xojsfjxmvwvk	备注	remark	textarea	f	\N	13	2026-04-01 07:04:14.057	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0h9002mxojsoubqb9ni	cmnfpa0h9002lxojs4jsot7pl	分包合同名称	name	input	t	\N	1	2026-04-01 07:04:14.062	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0h9002nxojseh3kjo71	cmnfpa0h9002lxojs4jsot7pl	关联项目	projectId	cascadeSelect	t	\N	2	2026-04-01 07:04:14.062	\N	\N	\N	f	\N	name	projects	id	\N	\N
cmnfpa0h9002oxojsfzw9fzuz	cmnfpa0h9002lxojs4jsot7pl	关联施工立项	constructionId	cascadeSelect	t	\N	3	2026-04-01 07:04:14.062	\N	\N	\N	f	\N	name	construction-approvals	id	\N	\N
cmnfpa0h9002pxojs12ixjgpk	cmnfpa0h9002lxojs4jsot7pl	分包类型	subcontractType	select	t	["装修","广告","设计","其它"]	4	2026-04-01 07:04:14.062	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0h9002qxojsoh6z6q6m	cmnfpa0h9002lxojs4jsot7pl	合同金额	contractAmount	number	t	\N	5	2026-04-01 07:04:14.062	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0h9002rxojsoa325l46	cmnfpa0h9002lxojs4jsot7pl	已付金额	paidAmount	number	f	\N	6	2026-04-01 07:04:14.062	\N	\N	\N	t	\N	\N	\N	\N	付款后自动更新	\N
cmnfpa0h9002sxojs33i4p9x6	cmnfpa0h9002lxojs4jsot7pl	应付金额	payableAmount	number	f	\N	7	2026-04-01 07:04:14.062	\N	\N	\N	t	\N	\N	\N	\N	付款后自动更新	\N
cmnfpa0h9002txojs1l8emix9	cmnfpa0h9002lxojs4jsot7pl	签订日期	signDate	date	f	\N	8	2026-04-01 07:04:14.062	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0h9002uxojsm2wvkmqn	cmnfpa0h9002lxojs4jsot7pl	附件	attachmentUrl	file	f	\N	9	2026-04-01 07:04:14.062	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0h9002vxojsnzxtmrky	cmnfpa0h9002lxojs4jsot7pl	备注	remark	textarea	f	\N	10	2026-04-01 07:04:14.062	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hd002xxojs7j8cn77w	cmnfpa0hd002wxojsrqpzmw12	分包合同名称	contractId	cascadeSelect	t	\N	1	2026-04-01 07:04:14.065	\N	\N	\N	f	[{"from":"vendor.name","to":"vendorName"},{"from":"vendor.bankAccount","to":"bankCard"},{"from":"vendor.bankName","to":"bankName"},{"from":"vendor.idNumber","to":"idNumber"},{"from":"vendor.phone","to":"phone"},{"from":"paidAmount","to":"paidAmount"},{"from":"payableAmount","to":"payableAmount"}]	name	subcontract-contracts	id	\N	\N
cmnfpa0hd002zxojsaqqcrrss	cmnfpa0hd002wxojsrqpzmw12	分包人员/单位	vendorName	input	t	\N	3	2026-04-01 07:04:14.065	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0hd0030xojslubltg7h	cmnfpa0hd002wxojsrqpzmw12	银行卡	bankCard	input	t	\N	4	2026-04-01 07:04:14.065	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0hd0031xojsilv7mk9e	cmnfpa0hd002wxojsrqpzmw12	开户行	bankName	input	t	\N	5	2026-04-01 07:04:14.065	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0hd0032xojswdcrlsvq	cmnfpa0hd002wxojsrqpzmw12	身份证号	idNumber	input	t	\N	6	2026-04-01 07:04:14.065	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0hd0033xojsh74xh28f	cmnfpa0hd002wxojsrqpzmw12	电话	phone	input	t	\N	7	2026-04-01 07:04:14.065	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0hd0034xojs03um9sla	cmnfpa0hd002wxojsrqpzmw12	已付金额	paidAmount	number	f	\N	8	2026-04-01 07:04:14.065	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0hd0035xojsz9bsi090	cmnfpa0hd002wxojsrqpzmw12	应付金额	payableAmount	number	f	\N	9	2026-04-01 07:04:14.065	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0hd0036xojsbj10dxn6	cmnfpa0hd002wxojsrqpzmw12	本次付款金额	paymentAmount	number	t	\N	10	2026-04-01 07:04:14.065	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hd0037xojsgsthxsy1	cmnfpa0hd002wxojsrqpzmw12	付款日期	paymentDate	date	t	\N	11	2026-04-01 07:04:14.065	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hd0038xojs1gohdmz9	cmnfpa0hd002wxojsrqpzmw12	附件	attachmentUrl	file	f	\N	12	2026-04-01 07:04:14.065	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hd0039xojs03x4dh0p	cmnfpa0hd002wxojsrqpzmw12	备注	remark	textarea	f	\N	13	2026-04-01 07:04:14.065	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hi003bxojs0k42slk1	cmnfpa0hh003axojs6py73ilm	供应商名称	name	input	t	\N	1	2026-04-01 07:04:14.07	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hi003cxojs9e517jsg	cmnfpa0hh003axojs6py73ilm	联系人	contact	input	f	\N	2	2026-04-01 07:04:14.07	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hi003dxojsphmwiiow	cmnfpa0hh003axojs6py73ilm	电话	phone	input	f	\N	3	2026-04-01 07:04:14.07	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hi003exojsqjcr06qf	cmnfpa0hh003axojs6py73ilm	银行卡号	bankAccount	input	t	\N	4	2026-04-01 07:04:14.07	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hi003fxojswgvok6di	cmnfpa0hh003axojs6py73ilm	开户行	bankName	input	t	\N	5	2026-04-01 07:04:14.07	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hi003gxojspxt31q10	cmnfpa0hh003axojs6py73ilm	税号	taxId	input	f	\N	6	2026-04-01 07:04:14.07	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hi003hxojsageba2us	cmnfpa0hh003axojs6py73ilm	地址	address	input	f	\N	7	2026-04-01 07:04:14.07	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hi003ixojs7ae6ogxs	cmnfpa0hh003axojs6py73ilm	附件	attachmentUrl	file	f	\N	8	2026-04-01 07:04:14.07	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hi003jxojseisikg6k	cmnfpa0hh003axojs6py73ilm	备注	remark	textarea	f	\N	9	2026-04-01 07:04:14.07	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hm003lxojstqtnjom5	cmnfpa0hl003kxojssa65ih2w	姓名	name	input	t	\N	1	2026-04-01 07:04:14.074	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hm003mxojsae9inm50	cmnfpa0hl003kxojssa65ih2w	电话	phone	input	f	\N	2	2026-04-01 07:04:14.074	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hm003nxojsm6o25w4a	cmnfpa0hl003kxojssa65ih2w	身份证号	idNumber	input	f	\N	3	2026-04-01 07:04:14.074	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hm003oxojswmiesaoq	cmnfpa0hl003kxojssa65ih2w	银行卡号	bankAccount	input	t	\N	4	2026-04-01 07:04:14.074	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hm003pxojsgrosldnv	cmnfpa0hl003kxojssa65ih2w	开户行	bankName	input	t	\N	5	2026-04-01 07:04:14.074	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hm003qxojsowa5kqf5	cmnfpa0hl003kxojssa65ih2w	地址	address	input	f	\N	6	2026-04-01 07:04:14.074	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hm003rxojsfvjinw9o	cmnfpa0hl003kxojssa65ih2w	附件	attachmentUrl	file	f	\N	7	2026-04-01 07:04:14.074	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hm003sxojs26b1ge36	cmnfpa0hl003kxojssa65ih2w	备注	remark	textarea	f	\N	8	2026-04-01 07:04:14.074	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hq003uxojsw8mz03eh	cmnfpa0hp003txojsau8tzl1r	项目合同名称	contractId	cascadeSelect	t	\N	1	2026-04-01 07:04:14.078	\N	\N	\N	f	[{"from":"contractAmount","to":"originalAmount"}]	name	project-contracts	id	\N	\N
cmnfpa0hq003vxojsgujst5q0	cmnfpa0hp003txojsau8tzl1r	变更日期	changeDate	date	t	\N	2	2026-04-01 07:04:14.078	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hq003wxojsoq6qcr8l	cmnfpa0hp003txojsau8tzl1r	增项金额	increaseAmount	number	t	\N	3	2026-04-01 07:04:14.078	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hq003xxojs0tygxnyj	cmnfpa0hp003txojsau8tzl1r	合同原金额	originalAmount	number	t	\N	4	2026-04-01 07:04:14.078	\N	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0hq003yxojsq6pjolx0	cmnfpa0hp003txojsau8tzl1r	合同总金额	totalAmount	number	t	\N	5	2026-04-01 07:04:14.078	originalAmount + increaseAmount	\N	\N	t	\N	\N	\N	\N	\N	\N
cmnfpa0hq003zxojsfpihy79z	cmnfpa0hp003txojsau8tzl1r	备注	remark	textarea	t	\N	6	2026-04-01 07:04:14.078	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hq0040xojsmmtk5vgg	cmnfpa0hp003txojsau8tzl1r	附件	attachmentUrl	file	t	\N	7	2026-04-01 07:04:14.078	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0ht0042xojs3umhqwjv	cmnfpa0ht0041xojsf3y0vsl8	收款事由	receiptType	input	t	\N	1	2026-04-01 07:04:14.081	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0ht0043xojsziifd4ca	cmnfpa0ht0041xojsf3y0vsl8	金额	receiptAmount	number	t	\N	2	2026-04-01 07:04:14.081	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0ht0044xojsyr4uebg4	cmnfpa0ht0041xojsf3y0vsl8	日期	receiptDate	date	t	\N	3	2026-04-01 07:04:14.081	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0ht0045xojsuo2trldy	cmnfpa0ht0041xojsf3y0vsl8	关联项目	projectId	cascadeSelect	f	\N	4	2026-04-01 07:04:14.081	\N	\N	\N	f	\N	name	projects	id	\N	\N
cmnfpa0ht0046xojscj8n44er	cmnfpa0ht0041xojsf3y0vsl8	备注	remark	textarea	t	\N	5	2026-04-01 07:04:14.081	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0ht0047xojs8c2rldyo	cmnfpa0ht0041xojsf3y0vsl8	附件	attachmentUrl	file	t	\N	6	2026-04-01 07:04:14.081	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hw0049xojswvwjyhrl	cmnfpa0hw0048xojs1puidrhw	付款事由	paymentType	input	t	\N	1	2026-04-01 07:04:14.084	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hw004axojsz9jy93as	cmnfpa0hw0048xojs1puidrhw	金额	paymentAmount	number	t	\N	2	2026-04-01 07:04:14.084	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hw004bxojsex8yzu3c	cmnfpa0hw0048xojs1puidrhw	日期	paymentDate	date	t	\N	3	2026-04-01 07:04:14.084	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hw004cxojstruc00rc	cmnfpa0hw0048xojs1puidrhw	关联项目	projectId	cascadeSelect	f	\N	4	2026-04-01 07:04:14.084	\N	\N	\N	f	\N	name	projects	id	\N	\N
cmnfpa0hw004dxojsw4o317bq	cmnfpa0hw0048xojs1puidrhw	备注	remark	textarea	t	\N	5	2026-04-01 07:04:14.084	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hw004exojscl2fcifc	cmnfpa0hw0048xojs1puidrhw	附件	attachmentUrl	file	t	\N	6	2026-04-01 07:04:14.084	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hz004gxojshoanwoc4	cmnfpa0hz004fxojs98b5jcoq	关联项目	projectId	cascadeSelect	t	\N	1	2026-04-01 07:04:14.088	\N	\N	\N	f	\N	name	projects	id	\N	\N
cmnfpa0hz004hxojsm1b992or	cmnfpa0hz004fxojs98b5jcoq	报销人	submitter	input	t	\N	2	2026-04-01 07:04:14.088	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hz004ixojsixlhemy9	cmnfpa0hz004fxojs98b5jcoq	总金额	totalAmount	number	t	\N	3	2026-04-01 07:04:14.088	\N	\N	\N	t	\N	\N	\N	\N	费用明细合计自动计算	\N
cmnfpa0hz004jxojsik5tli5u	cmnfpa0hz004fxojs98b5jcoq	费用明细	expenseItems	table	f	\N	4	2026-04-01 07:04:14.088	\N	\N	\N	f	\N	\N	\N	\N	\N	[{"key":"type","label":"费用类别","componentType":"select","options":["材料","人工","其它"]},{"key":"amount","label":"金额","componentType":"number"},{"key":"attachmentUrl","label":"附件","componentType":"file"}]
cmnfpa0hz004kxojsr7dxau2s	cmnfpa0hz004fxojs98b5jcoq	日期	expenseDate	date	t	\N	5	2026-04-01 07:04:14.088	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hz004lxojsbpg6n425	cmnfpa0hz004fxojs98b5jcoq	备注	remark	textarea	f	\N	6	2026-04-01 07:04:14.088	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0hz004mxojs7kkb126l	cmnfpa0hz004fxojs98b5jcoq	附件	attachmentUrl	file	f	\N	7	2026-04-01 07:04:14.088	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0i3004oxojs7yj7262l	cmnfpa0i3004nxojsh2293ace	报销人	submitter	input	t	\N	1	2026-04-01 07:04:14.092	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0i3004pxojsoxuxania	cmnfpa0i3004nxojsh2293ace	总金额	totalAmount	number	t	\N	2	2026-04-01 07:04:14.092	\N	\N	\N	t	\N	\N	\N	\N	费用明细合计自动计算	\N
cmnfpa0i3004qxojs2xzqcnow	cmnfpa0i3004nxojsh2293ace	费用明细	expenseItems	table	f	\N	3	2026-04-01 07:04:14.092	\N	\N	\N	f	\N	\N	\N	\N	\N	[{"key":"type","label":"费用类别","componentType":"select","options":["职工薪酬","办公费","交通费","员工福利","其他"]},{"key":"amount","label":"金额","componentType":"number"},{"key":"attachmentUrl","label":"附件","componentType":"file"}]
cmnfpa0i3004rxojspsx381a2	cmnfpa0i3004nxojsh2293ace	日期	expenseDate	date	t	\N	4	2026-04-01 07:04:14.092	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0i3004sxojs2cjxu0un	cmnfpa0i3004nxojsh2293ace	备注	remark	textarea	f	\N	5	2026-04-01 07:04:14.092	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0i3004txojso8fgicly	cmnfpa0i3004nxojsh2293ace	附件	attachmentUrl	file	f	\N	6	2026-04-01 07:04:14.092	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0i7004vxojst5nuqdsv	cmnfpa0i7004uxojsd7mqr2l0	报销人	submitter	input	t	\N	1	2026-04-01 07:04:14.095	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0i7004wxojs5azknvs6	cmnfpa0i7004uxojsd7mqr2l0	总金额	totalAmount	number	t	\N	2	2026-04-01 07:04:14.095	\N	\N	\N	t	\N	\N	\N	\N	费用明细合计自动计算	\N
cmnfpa0i7004xxojs36hah00h	cmnfpa0i7004uxojsd7mqr2l0	费用明细	expenseItems	table	f	\N	3	2026-04-01 07:04:14.095	\N	\N	\N	f	\N	\N	\N	\N	\N	[{"key":"type","label":"费用类别","componentType":"select","options":["烟酒费","餐费","饭局","其他"]},{"key":"amount","label":"金额","componentType":"number"},{"key":"attachmentUrl","label":"附件","componentType":"file"}]
cmnfpa0i7004yxojsat17rhzp	cmnfpa0i7004uxojsd7mqr2l0	日期	expenseDate	date	t	\N	4	2026-04-01 07:04:14.095	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0i7004zxojsnj0nxldn	cmnfpa0i7004uxojsd7mqr2l0	备注	remark	textarea	f	\N	5	2026-04-01 07:04:14.095	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0i70050xojsgmnaitxr	cmnfpa0i7004uxojsd7mqr2l0	附件	attachmentUrl	file	f	\N	6	2026-04-01 07:04:14.095	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0ia0052xojsgrc8ahyx	cmnfpa0ia0051xojslnvh95xd	申请事由	applyReason	input	t	\N	1	2026-04-01 07:04:14.099	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0ia0053xojszq48h3oh	cmnfpa0ia0051xojslnvh95xd	申请人	holder	input	t	\N	2	2026-04-01 07:04:14.099	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0ia0054xojssovfcv4w	cmnfpa0ia0051xojslnvh95xd	金额	issuedAmount	number	t	\N	3	2026-04-01 07:04:14.099	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0ia0055xojs3v0o7ste	cmnfpa0ia0051xojslnvh95xd	关联项目	projectId	cascadeSelect	t	\N	4	2026-04-01 07:04:14.099	\N	\N	\N	f	\N	name	projects	id	\N	\N
cmnfpa0ia0056xojs2yzlg17i	cmnfpa0ia0051xojslnvh95xd	日期	issueDate	date	t	\N	5	2026-04-01 07:04:14.099	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0ia0057xojs2fljdfq2	cmnfpa0ia0051xojslnvh95xd	备注	remark	textarea	f	\N	6	2026-04-01 07:04:14.099	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
cmnfpa0ia0058xojs62rnpvnr	cmnfpa0ia0051xojslnvh95xd	附件	attachmentUrl	file	f	\N	7	2026-04-01 07:04:14.099	\N	\N	\N	f	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: LaborContract; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."LaborContract" (id, "constructionId", name, code, "signDate", remark, "createdAt", "approvalStatus", "approvedAt", "changedAmount", "contractAmount", "endDate", "paidAmount", "payableAmount", "projectId", "rejectedAt", "rejectedReason", "startDate", "submittedAt", "unpaidAmount", "updatedAt", "workerId", status, "regionId", "attachmentUrl", "laborType") FROM stdin;
\.


--
-- Data for Name: LaborPayment; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."LaborPayment" (id, "contractId", remark, "createdAt", "approvalStatus", "approvedAt", "paymentAmount", "paymentDate", "paymentMethod", "paymentNumber", "projectId", "rejectedAt", "rejectedReason", status, "submittedAt", "updatedAt", "workerId", "regionId") FROM stdin;
\.


--
-- Data for Name: LaborWorker; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."LaborWorker" (id, code, name, "idNumber", phone, address, "bankAccount", "bankName", status, remark, "createdAt", "updatedAt", "attachmentUrl") FROM stdin;
\.


--
-- Data for Name: ManagementExpense; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."ManagementExpense" (id, "projectId", category, "expenseDate", description, remark, "createdAt", "expenseAmount", "updatedAt", "approvalStatus", "approvedAt", "attachmentUrl", "expenseItems", "rejectedAt", "rejectedReason", "submittedAt", submitter, "totalAmount") FROM stdin;
\.


--
-- Data for Name: OrganizationUnit; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."OrganizationUnit" (id, name, code, "parentId", "isActive", remark, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: OtherPayment; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."OtherPayment" (id, "projectId", "paymentType", "paymentAmount", "paymentDate", "paymentMethod", "paymentNumber", status, remark, "createdAt", "updatedAt", "approvalStatus", "approvedAt", "attachmentUrl", "rejectedAt", "rejectedReason", "submittedAt") FROM stdin;
\.


--
-- Data for Name: OtherReceipt; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."OtherReceipt" (id, "projectId", "receiptType", "receiptAmount", "receiptDate", "receiptMethod", "receiptNumber", remark, "createdAt", "updatedAt", "approvalStatus", "approvedAt", "attachmentUrl", "rejectedAt", "rejectedReason", "submittedAt") FROM stdin;
\.


--
-- Data for Name: PettyCash; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."PettyCash" (id, holder, "issueDate", "returnDate", description, remark, "createdAt", "issuedAmount", "projectId", "returnedAmount", status, "updatedAt", "applyReason", "approvalStatus", "approvedAt", "attachmentUrl", "rejectedAt", "rejectedReason", "submittedAt") FROM stdin;
\.


--
-- Data for Name: ProcessDefinition; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."ProcessDefinition" (id, "resourceType", name, "isActive", "createdAt", "updatedAt") FROM stdin;
cmnfnn1u00000wdoy6eo4ksy8	projects	项目新增审批	t	2026-04-01 06:18:23.113	2026-04-01 06:18:23.113
cmnfnn1ua0004wdoyx72skoyz	project-contracts	项目合同审批	t	2026-04-01 06:18:23.122	2026-04-01 06:18:23.122
cmnfnn1uh0008wdoy98ju2ouw	contract-receipts	项目合同收款审批	t	2026-04-01 06:18:23.129	2026-04-01 06:18:23.129
cmnfnn1um000cwdoyc2eixz8h	construction-approvals	施工立项审批	t	2026-04-01 06:18:23.134	2026-04-01 06:18:23.134
cmnfnn1ur000gwdoythqwe3md	project-contract-changes	项目合同变更审批	t	2026-04-01 06:18:23.139	2026-04-01 06:18:23.139
cmnfnn1ux000kwdoyrmcojfjv	procurement-contracts	采购合同审批	t	2026-04-01 06:18:23.146	2026-04-01 06:18:23.146
cmnfnn1v2000owdoy8pz508ce	procurement-payments	采购付款审批	t	2026-04-01 06:18:23.15	2026-04-01 06:18:23.15
cmnfnn1v7000swdoyb7u1aogn	labor-contracts	劳务合同审批	t	2026-04-01 06:18:23.156	2026-04-01 06:18:23.156
cmnfnn1vc000vwdoycbo7brj0	subcontract-contracts	分包合同审批	t	2026-04-01 06:18:23.16	2026-04-01 06:18:23.16
cmnfnn1vf000ywdoyb51zfp6f	labor-payments	劳务付款审批	t	2026-04-01 06:18:23.163	2026-04-01 06:18:23.163
cmnfnn1vj0011wdoymk6vibql	subcontract-payments	分包付款审批	t	2026-04-01 06:18:23.168	2026-04-01 06:18:23.168
cmnfnn1vp0014wdoyyi1y6mvz	other-receipts	其他收款审批	t	2026-04-01 06:18:23.173	2026-04-01 06:18:23.173
cmnfnn1vs0017wdoyg5r48sft	other-payments	其他付款审批	t	2026-04-01 06:18:23.176	2026-04-01 06:18:23.176
cmnfnn1vu001awdoyvcndofkl	project-expenses	项目费用报销审批	t	2026-04-01 06:18:23.179	2026-04-01 06:18:23.179
cmnfnn1vx001dwdoyqudndjcl	management-expenses	管理费用报销审批	t	2026-04-01 06:18:23.182	2026-04-01 06:18:23.182
cmnfnn1w1001gwdoy5j39lnl9	sales-expenses	销售费用报销审批	t	2026-04-01 06:18:23.186	2026-04-01 06:18:23.186
cmnfnn1w7001jwdoypmr9sjds	petty-cashes	备用金申请审批	t	2026-04-01 06:18:23.191	2026-04-01 06:18:23.191
\.


--
-- Data for Name: ProcessInstance; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."ProcessInstance" (id, "definitionId", "resourceType", "resourceId", "submitterUserId", "submitterName", status, "startedAt", "finishedAt") FROM stdin;
\.


--
-- Data for Name: ProcessNode; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."ProcessNode" (id, "definitionId", "order", name, "approverType", "approverRole", "approverUserId", "ccMode", "ccRole", "ccUserId", "createdAt", "updatedAt") FROM stdin;
cmnfnn1u10001wdoymgy56p1g	cmnfnn1u00000wdoy6eo4ksy8	1	马建波审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.113	2026-04-01 06:18:23.113
cmnfnn1u10002wdoy6ygj18qk	cmnfnn1u00000wdoy6eo4ksy8	2	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.113	2026-04-01 06:18:23.113
cmnfnn1u10003wdoydx0kfd6z	cmnfnn1u00000wdoy6eo4ksy8	3	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.113	2026-04-01 06:18:23.113
cmnfnn1ua0005wdoy73w9v5i1	cmnfnn1ua0004wdoyx72skoyz	1	马建波审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.122	2026-04-01 06:18:23.122
cmnfnn1ua0006wdoysvevwg1a	cmnfnn1ua0004wdoyx72skoyz	2	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.122	2026-04-01 06:18:23.122
cmnfnn1ua0007wdoy6exmzixh	cmnfnn1ua0004wdoyx72skoyz	3	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.122	2026-04-01 06:18:23.122
cmnfnn1uh0009wdoy52e5rgwk	cmnfnn1uh0008wdoy98ju2ouw	1	马建波审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.129	2026-04-01 06:18:23.129
cmnfnn1uh000awdoy8wg9le8u	cmnfnn1uh0008wdoy98ju2ouw	2	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.129	2026-04-01 06:18:23.129
cmnfnn1uh000bwdoytk5reifo	cmnfnn1uh0008wdoy98ju2ouw	3	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.129	2026-04-01 06:18:23.129
cmnfnn1um000dwdoyxyrg5vqq	cmnfnn1um000cwdoyc2eixz8h	1	马建波审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.134	2026-04-01 06:18:23.134
cmnfnn1um000ewdoyyugbasa1	cmnfnn1um000cwdoyc2eixz8h	2	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.134	2026-04-01 06:18:23.134
cmnfnn1um000fwdoytw61lu69	cmnfnn1um000cwdoyc2eixz8h	3	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.134	2026-04-01 06:18:23.134
cmnfnn1ur000hwdoy3g3sa0wr	cmnfnn1ur000gwdoythqwe3md	1	马建波审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.139	2026-04-01 06:18:23.139
cmnfnn1ur000iwdoyaddt3wro	cmnfnn1ur000gwdoythqwe3md	2	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.139	2026-04-01 06:18:23.139
cmnfnn1ur000jwdoy64wr34n5	cmnfnn1ur000gwdoythqwe3md	3	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.139	2026-04-01 06:18:23.139
cmnfnn1ux000lwdoyi7k01tqp	cmnfnn1ux000kwdoyrmcojfjv	1	马亚笑审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.146	2026-04-01 06:18:23.146
cmnfnn1ux000mwdoyn0dzl1ug	cmnfnn1ux000kwdoyrmcojfjv	2	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.146	2026-04-01 06:18:23.146
cmnfnn1uy000nwdoy3ahv3hij	cmnfnn1ux000kwdoyrmcojfjv	3	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.146	2026-04-01 06:18:23.146
cmnfnn1v2000pwdoypt1bjx33	cmnfnn1v2000owdoy8pz508ce	1	马亚笑审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.15	2026-04-01 06:18:23.15
cmnfnn1v2000qwdoy9j3bmirx	cmnfnn1v2000owdoy8pz508ce	2	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.15	2026-04-01 06:18:23.15
cmnfnn1v2000rwdoyi7s8n8ti	cmnfnn1v2000owdoy8pz508ce	3	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.15	2026-04-01 06:18:23.15
cmnfnn1v8000twdoyu812mbhv	cmnfnn1v7000swdoyb7u1aogn	1	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.156	2026-04-01 06:18:23.156
cmnfnn1v8000uwdoyi9z81d9y	cmnfnn1v7000swdoyb7u1aogn	2	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.156	2026-04-01 06:18:23.156
cmnfnn1vc000wwdoyizua86sh	cmnfnn1vc000vwdoycbo7brj0	1	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.16	2026-04-01 06:18:23.16
cmnfnn1vc000xwdoyx6rx1x0z	cmnfnn1vc000vwdoycbo7brj0	2	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.16	2026-04-01 06:18:23.16
cmnfnn1vf000zwdoy116l15in	cmnfnn1vf000ywdoyb51zfp6f	1	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.163	2026-04-01 06:18:23.163
cmnfnn1vf0010wdoyfd4qqp98	cmnfnn1vf000ywdoyb51zfp6f	2	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.163	2026-04-01 06:18:23.163
cmnfnn1vj0012wdoycq891skf	cmnfnn1vj0011wdoymk6vibql	1	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.168	2026-04-01 06:18:23.168
cmnfnn1vj0013wdoyjsibgxux	cmnfnn1vj0011wdoymk6vibql	2	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.168	2026-04-01 06:18:23.168
cmnfnn1vp0015wdoy81anh9km	cmnfnn1vp0014wdoyyi1y6mvz	1	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.173	2026-04-01 06:18:23.173
cmnfnn1vp0016wdoyv8lyjnpb	cmnfnn1vp0014wdoyyi1y6mvz	2	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.173	2026-04-01 06:18:23.173
cmnfnn1vs0018wdoynlslm75i	cmnfnn1vs0017wdoyg5r48sft	1	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.176	2026-04-01 06:18:23.176
cmnfnn1vs0019wdoyukbgd58s	cmnfnn1vs0017wdoyg5r48sft	2	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.176	2026-04-01 06:18:23.176
cmnfnn1vu001bwdoyadk2ztdm	cmnfnn1vu001awdoyvcndofkl	1	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.179	2026-04-01 06:18:23.179
cmnfnn1vu001cwdoymohf43p5	cmnfnn1vu001awdoyvcndofkl	2	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.179	2026-04-01 06:18:23.179
cmnfnn1vx001ewdoybmyyio7p	cmnfnn1vx001dwdoyqudndjcl	1	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.182	2026-04-01 06:18:23.182
cmnfnn1vx001fwdoykqzoiibh	cmnfnn1vx001dwdoyqudndjcl	2	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.182	2026-04-01 06:18:23.182
cmnfnn1w1001hwdoy5x9293nm	cmnfnn1w1001gwdoy5j39lnl9	1	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.186	2026-04-01 06:18:23.186
cmnfnn1w2001iwdoysm7fbktu	cmnfnn1w1001gwdoy5j39lnl9	2	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.186	2026-04-01 06:18:23.186
cmnfnn1w7001kwdoyftvs2r05	cmnfnn1w7001jwdoypmr9sjds	1	马玉杰审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.191	2026-04-01 06:18:23.191
cmnfnn1w7001lwdoyjrj5ro79	cmnfnn1w7001jwdoypmr9sjds	2	牟晓山审批	ROLE	ADMIN	\N	NONE	\N	\N	2026-04-01 06:18:23.191	2026-04-01 06:18:23.191
\.


--
-- Data for Name: ProcessTask; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."ProcessTask" (id, "instanceId", "nodeId", "nodeOrder", "approverType", "approverRole", "approverUserId", status, comment, "handledAt", "handledBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: ProcurementContract; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."ProcurementContract" (id, "constructionId", "supplierId", name, code, "signDate", remark, "createdAt", "approvalStatus", "approvedAt", "changedAmount", "contractAmount", "endDate", "paidAmount", "payableAmount", "projectId", "rejectedAt", "rejectedReason", "startDate", "submittedAt", "unpaidAmount", "updatedAt", status, "regionId", "attachmentUrl", "materialCategory") FROM stdin;
\.


--
-- Data for Name: ProcurementPayment; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."ProcurementPayment" (id, "contractId", remark, "createdAt", "approvalStatus", "approvedAt", "paymentAmount", "paymentDate", "paymentMethod", "paymentNumber", "projectId", "rejectedAt", "rejectedReason", status, "submittedAt", "updatedAt", "regionId") FROM stdin;
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."Project" (id, name, code, "customerId", "startDate", "endDate", remark, "createdAt", budget, "updatedAt", status, "regionId", area, "bidMethod", location, "projectType") FROM stdin;
\.


--
-- Data for Name: ProjectContract; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."ProjectContract" (id, "projectId", name, code, "signDate", remark, "createdAt", "changedAmount", "contractAmount", "customerId", "endDate", "receivableAmount", "receivedAmount", "startDate", "unreceivedAmount", "updatedAt", status, "regionId", "attachmentUrl", "contractType", "hasRetention", "paymentMethod", "retentionAmount", "retentionRate") FROM stdin;
\.


--
-- Data for Name: ProjectContractChange; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."ProjectContractChange" (id, "contractId", "changeType", "changeAmount", "changeReason", remark, "createdAt", "updatedAt", "approvalStatus", "approvedAt", "attachmentUrl", "changeDate", "increaseAmount", "originalAmount", "rejectedAt", "rejectedReason", "submittedAt", "totalAmount") FROM stdin;
\.


--
-- Data for Name: ProjectExpense; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."ProjectExpense" (id, "expenseDate", description, remark, "createdAt", "expenseAmount", "projectId", "updatedAt", category, "approvalStatus", "approvedAt", "attachmentUrl", "expenseItems", "rejectedAt", "rejectedReason", "submittedAt", submitter, "totalAmount") FROM stdin;
\.


--
-- Data for Name: ProjectStatusChange; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."ProjectStatusChange" (id, "projectId", "fromStatus", "toStatus", "changeReason", remark, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Region; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."Region" (id, name, code, "isActive", "createdAt", "updatedAt") FROM stdin;
cmnfnmgh40000sioaormljf3c	默认区域	DEFAULT	t	2026-04-01 06:17:55.432	2026-04-01 06:17:55.432
\.


--
-- Data for Name: SalesExpense; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."SalesExpense" (id, "projectId", category, "expenseDate", description, remark, "createdAt", "expenseAmount", "updatedAt", "approvalStatus", "approvedAt", "attachmentUrl", "expenseItems", "rejectedAt", "rejectedReason", "submittedAt", submitter, "totalAmount") FROM stdin;
\.


--
-- Data for Name: SubcontractContract; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."SubcontractContract" (id, "constructionId", name, code, "signDate", remark, "createdAt", "approvalStatus", "approvedAt", "changedAmount", "contractAmount", "endDate", "paidAmount", "payableAmount", "projectId", "rejectedAt", "rejectedReason", "startDate", "submittedAt", "unpaidAmount", "updatedAt", "vendorId", status, "regionId", "attachmentUrl", "subcontractType") FROM stdin;
\.


--
-- Data for Name: SubcontractPayment; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."SubcontractPayment" (id, "contractId", remark, "createdAt", "approvalStatus", "approvedAt", "paymentAmount", "paymentDate", "paymentMethod", "paymentNumber", "projectId", "rejectedAt", "rejectedReason", status, "submittedAt", "updatedAt", "vendorId", "regionId") FROM stdin;
\.


--
-- Data for Name: SubcontractVendor; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."SubcontractVendor" (id, code, name, contact, phone, email, address, "taxId", "bankAccount", "bankName", status, remark, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Supplier; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."Supplier" (id, name, contact, phone, email, address, remark, "createdAt", "bankAccount", "bankName", code, status, "taxId", "updatedAt", "attachmentUrl") FROM stdin;
\.


--
-- Data for Name: SystemUser; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."SystemUser" (id, "dingUserId", name, mobile, unionid, role, "isActive", "deptIdsJson", "deptNamesJson", "lastLoginAt", remark, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SystemUserOrgUnit; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public."SystemUserOrgUnit" (id, "systemUserId", "orgUnitId", "createdAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: a1
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
d1cd7300-6a8c-4009-a27f-c34b9601c6a0	e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855	2026-04-01 14:12:16.133575+08	20260329_add_feature_flag_table	\N	\N	2026-04-01 14:12:16.130355+08	1
\.


--
-- Name: ActionLog ActionLog_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ActionLog"
    ADD CONSTRAINT "ActionLog_pkey" PRIMARY KEY (id);


--
-- Name: ConstructionApproval ConstructionApproval_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ConstructionApproval"
    ADD CONSTRAINT "ConstructionApproval_pkey" PRIMARY KEY (id);


--
-- Name: ContractReceipt ContractReceipt_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ContractReceipt"
    ADD CONSTRAINT "ContractReceipt_pkey" PRIMARY KEY (id);


--
-- Name: Customer Customer_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (id);


--
-- Name: FormDefinition FormDefinition_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."FormDefinition"
    ADD CONSTRAINT "FormDefinition_pkey" PRIMARY KEY (id);


--
-- Name: FormField FormField_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."FormField"
    ADD CONSTRAINT "FormField_pkey" PRIMARY KEY (id);


--
-- Name: LaborContract LaborContract_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."LaborContract"
    ADD CONSTRAINT "LaborContract_pkey" PRIMARY KEY (id);


--
-- Name: LaborPayment LaborPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."LaborPayment"
    ADD CONSTRAINT "LaborPayment_pkey" PRIMARY KEY (id);


--
-- Name: LaborWorker LaborWorker_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."LaborWorker"
    ADD CONSTRAINT "LaborWorker_pkey" PRIMARY KEY (id);


--
-- Name: ManagementExpense ManagementExpense_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ManagementExpense"
    ADD CONSTRAINT "ManagementExpense_pkey" PRIMARY KEY (id);


--
-- Name: OrganizationUnit OrganizationUnit_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."OrganizationUnit"
    ADD CONSTRAINT "OrganizationUnit_pkey" PRIMARY KEY (id);


--
-- Name: OtherPayment OtherPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."OtherPayment"
    ADD CONSTRAINT "OtherPayment_pkey" PRIMARY KEY (id);


--
-- Name: OtherReceipt OtherReceipt_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."OtherReceipt"
    ADD CONSTRAINT "OtherReceipt_pkey" PRIMARY KEY (id);


--
-- Name: PettyCash PettyCash_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."PettyCash"
    ADD CONSTRAINT "PettyCash_pkey" PRIMARY KEY (id);


--
-- Name: ProcessDefinition ProcessDefinition_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcessDefinition"
    ADD CONSTRAINT "ProcessDefinition_pkey" PRIMARY KEY (id);


--
-- Name: ProcessInstance ProcessInstance_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcessInstance"
    ADD CONSTRAINT "ProcessInstance_pkey" PRIMARY KEY (id);


--
-- Name: ProcessNode ProcessNode_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcessNode"
    ADD CONSTRAINT "ProcessNode_pkey" PRIMARY KEY (id);


--
-- Name: ProcessTask ProcessTask_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcessTask"
    ADD CONSTRAINT "ProcessTask_pkey" PRIMARY KEY (id);


--
-- Name: ProcurementContract ProcurementContract_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcurementContract"
    ADD CONSTRAINT "ProcurementContract_pkey" PRIMARY KEY (id);


--
-- Name: ProcurementPayment ProcurementPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcurementPayment"
    ADD CONSTRAINT "ProcurementPayment_pkey" PRIMARY KEY (id);


--
-- Name: ProjectContractChange ProjectContractChange_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProjectContractChange"
    ADD CONSTRAINT "ProjectContractChange_pkey" PRIMARY KEY (id);


--
-- Name: ProjectContract ProjectContract_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProjectContract"
    ADD CONSTRAINT "ProjectContract_pkey" PRIMARY KEY (id);


--
-- Name: ProjectExpense ProjectExpense_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProjectExpense"
    ADD CONSTRAINT "ProjectExpense_pkey" PRIMARY KEY (id);


--
-- Name: ProjectStatusChange ProjectStatusChange_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProjectStatusChange"
    ADD CONSTRAINT "ProjectStatusChange_pkey" PRIMARY KEY (id);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: Region Region_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."Region"
    ADD CONSTRAINT "Region_pkey" PRIMARY KEY (id);


--
-- Name: SalesExpense SalesExpense_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SalesExpense"
    ADD CONSTRAINT "SalesExpense_pkey" PRIMARY KEY (id);


--
-- Name: SubcontractContract SubcontractContract_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SubcontractContract"
    ADD CONSTRAINT "SubcontractContract_pkey" PRIMARY KEY (id);


--
-- Name: SubcontractPayment SubcontractPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SubcontractPayment"
    ADD CONSTRAINT "SubcontractPayment_pkey" PRIMARY KEY (id);


--
-- Name: SubcontractVendor SubcontractVendor_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SubcontractVendor"
    ADD CONSTRAINT "SubcontractVendor_pkey" PRIMARY KEY (id);


--
-- Name: Supplier Supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_pkey" PRIMARY KEY (id);


--
-- Name: SystemUserOrgUnit SystemUserOrgUnit_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SystemUserOrgUnit"
    ADD CONSTRAINT "SystemUserOrgUnit_pkey" PRIMARY KEY (id);


--
-- Name: SystemUser SystemUser_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SystemUser"
    ADD CONSTRAINT "SystemUser_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ActionLog_createdAt_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ActionLog_createdAt_idx" ON public."ActionLog" USING btree ("createdAt");


--
-- Name: ActionLog_resource_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ActionLog_resource_idx" ON public."ActionLog" USING btree (resource);


--
-- Name: ActionLog_userId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ActionLog_userId_idx" ON public."ActionLog" USING btree ("userId");


--
-- Name: ConstructionApproval_approvalStatus_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ConstructionApproval_approvalStatus_idx" ON public."ConstructionApproval" USING btree ("approvalStatus");


--
-- Name: ConstructionApproval_code_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ConstructionApproval_code_idx" ON public."ConstructionApproval" USING btree (code);


--
-- Name: ConstructionApproval_code_key; Type: INDEX; Schema: public; Owner: a1
--

CREATE UNIQUE INDEX "ConstructionApproval_code_key" ON public."ConstructionApproval" USING btree (code);


--
-- Name: ConstructionApproval_contractId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ConstructionApproval_contractId_idx" ON public."ConstructionApproval" USING btree ("contractId");


--
-- Name: ConstructionApproval_projectId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ConstructionApproval_projectId_idx" ON public."ConstructionApproval" USING btree ("projectId");


--
-- Name: ContractReceipt_contractId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ContractReceipt_contractId_idx" ON public."ContractReceipt" USING btree ("contractId");


--
-- Name: ContractReceipt_receiptDate_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ContractReceipt_receiptDate_idx" ON public."ContractReceipt" USING btree ("receiptDate");


--
-- Name: Customer_code_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "Customer_code_idx" ON public."Customer" USING btree (code);


--
-- Name: Customer_code_key; Type: INDEX; Schema: public; Owner: a1
--

CREATE UNIQUE INDEX "Customer_code_key" ON public."Customer" USING btree (code);


--
-- Name: Customer_name_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "Customer_name_idx" ON public."Customer" USING btree (name);


--
-- Name: FormDefinition_code_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "FormDefinition_code_idx" ON public."FormDefinition" USING btree (code);


--
-- Name: FormDefinition_code_key; Type: INDEX; Schema: public; Owner: a1
--

CREATE UNIQUE INDEX "FormDefinition_code_key" ON public."FormDefinition" USING btree (code);


--
-- Name: FormField_formId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "FormField_formId_idx" ON public."FormField" USING btree ("formId");


--
-- Name: FormField_formId_sortOrder_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "FormField_formId_sortOrder_idx" ON public."FormField" USING btree ("formId", "sortOrder");


--
-- Name: LaborContract_approvalStatus_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "LaborContract_approvalStatus_idx" ON public."LaborContract" USING btree ("approvalStatus");


--
-- Name: LaborContract_code_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "LaborContract_code_idx" ON public."LaborContract" USING btree (code);


--
-- Name: LaborContract_code_key; Type: INDEX; Schema: public; Owner: a1
--

CREATE UNIQUE INDEX "LaborContract_code_key" ON public."LaborContract" USING btree (code);


--
-- Name: LaborContract_constructionId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "LaborContract_constructionId_idx" ON public."LaborContract" USING btree ("constructionId");


--
-- Name: LaborContract_projectId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "LaborContract_projectId_idx" ON public."LaborContract" USING btree ("projectId");


--
-- Name: LaborContract_status_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "LaborContract_status_idx" ON public."LaborContract" USING btree (status);


--
-- Name: LaborContract_workerId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "LaborContract_workerId_idx" ON public."LaborContract" USING btree ("workerId");


--
-- Name: LaborPayment_approvalStatus_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "LaborPayment_approvalStatus_idx" ON public."LaborPayment" USING btree ("approvalStatus");


--
-- Name: LaborPayment_contractId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "LaborPayment_contractId_idx" ON public."LaborPayment" USING btree ("contractId");


--
-- Name: LaborPayment_paymentDate_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "LaborPayment_paymentDate_idx" ON public."LaborPayment" USING btree ("paymentDate");


--
-- Name: LaborPayment_projectId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "LaborPayment_projectId_idx" ON public."LaborPayment" USING btree ("projectId");


--
-- Name: LaborPayment_workerId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "LaborPayment_workerId_idx" ON public."LaborPayment" USING btree ("workerId");


--
-- Name: LaborWorker_code_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "LaborWorker_code_idx" ON public."LaborWorker" USING btree (code);


--
-- Name: LaborWorker_code_key; Type: INDEX; Schema: public; Owner: a1
--

CREATE UNIQUE INDEX "LaborWorker_code_key" ON public."LaborWorker" USING btree (code);


--
-- Name: LaborWorker_name_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "LaborWorker_name_idx" ON public."LaborWorker" USING btree (name);


--
-- Name: ManagementExpense_expenseDate_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ManagementExpense_expenseDate_idx" ON public."ManagementExpense" USING btree ("expenseDate");


--
-- Name: ManagementExpense_projectId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ManagementExpense_projectId_idx" ON public."ManagementExpense" USING btree ("projectId");


--
-- Name: OrganizationUnit_code_key; Type: INDEX; Schema: public; Owner: a1
--

CREATE UNIQUE INDEX "OrganizationUnit_code_key" ON public."OrganizationUnit" USING btree (code);


--
-- Name: OrganizationUnit_parentId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "OrganizationUnit_parentId_idx" ON public."OrganizationUnit" USING btree ("parentId");


--
-- Name: OtherPayment_paymentDate_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "OtherPayment_paymentDate_idx" ON public."OtherPayment" USING btree ("paymentDate");


--
-- Name: OtherPayment_projectId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "OtherPayment_projectId_idx" ON public."OtherPayment" USING btree ("projectId");


--
-- Name: OtherReceipt_projectId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "OtherReceipt_projectId_idx" ON public."OtherReceipt" USING btree ("projectId");


--
-- Name: OtherReceipt_receiptDate_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "OtherReceipt_receiptDate_idx" ON public."OtherReceipt" USING btree ("receiptDate");


--
-- Name: PettyCash_issueDate_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "PettyCash_issueDate_idx" ON public."PettyCash" USING btree ("issueDate");


--
-- Name: PettyCash_projectId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "PettyCash_projectId_idx" ON public."PettyCash" USING btree ("projectId");


--
-- Name: ProcessDefinition_resourceType_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProcessDefinition_resourceType_idx" ON public."ProcessDefinition" USING btree ("resourceType");


--
-- Name: ProcessDefinition_resourceType_key; Type: INDEX; Schema: public; Owner: a1
--

CREATE UNIQUE INDEX "ProcessDefinition_resourceType_key" ON public."ProcessDefinition" USING btree ("resourceType");


--
-- Name: ProcessInstance_resourceType_resourceId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProcessInstance_resourceType_resourceId_idx" ON public."ProcessInstance" USING btree ("resourceType", "resourceId");


--
-- Name: ProcessInstance_status_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProcessInstance_status_idx" ON public."ProcessInstance" USING btree (status);


--
-- Name: ProcessNode_definitionId_order_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProcessNode_definitionId_order_idx" ON public."ProcessNode" USING btree ("definitionId", "order");


--
-- Name: ProcessTask_instanceId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProcessTask_instanceId_idx" ON public."ProcessTask" USING btree ("instanceId");


--
-- Name: ProcessTask_nodeId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProcessTask_nodeId_idx" ON public."ProcessTask" USING btree ("nodeId");


--
-- Name: ProcessTask_status_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProcessTask_status_idx" ON public."ProcessTask" USING btree (status);


--
-- Name: ProcurementContract_code_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProcurementContract_code_idx" ON public."ProcurementContract" USING btree (code);


--
-- Name: ProcurementContract_code_key; Type: INDEX; Schema: public; Owner: a1
--

CREATE UNIQUE INDEX "ProcurementContract_code_key" ON public."ProcurementContract" USING btree (code);


--
-- Name: ProcurementContract_constructionId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProcurementContract_constructionId_idx" ON public."ProcurementContract" USING btree ("constructionId");


--
-- Name: ProcurementContract_projectId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProcurementContract_projectId_idx" ON public."ProcurementContract" USING btree ("projectId");


--
-- Name: ProcurementContract_status_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProcurementContract_status_idx" ON public."ProcurementContract" USING btree (status);


--
-- Name: ProcurementContract_supplierId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProcurementContract_supplierId_idx" ON public."ProcurementContract" USING btree ("supplierId");


--
-- Name: ProcurementPayment_approvalStatus_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProcurementPayment_approvalStatus_idx" ON public."ProcurementPayment" USING btree ("approvalStatus");


--
-- Name: ProcurementPayment_contractId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProcurementPayment_contractId_idx" ON public."ProcurementPayment" USING btree ("contractId");


--
-- Name: ProcurementPayment_paymentDate_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProcurementPayment_paymentDate_idx" ON public."ProcurementPayment" USING btree ("paymentDate");


--
-- Name: ProcurementPayment_projectId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProcurementPayment_projectId_idx" ON public."ProcurementPayment" USING btree ("projectId");


--
-- Name: ProjectContractChange_contractId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProjectContractChange_contractId_idx" ON public."ProjectContractChange" USING btree ("contractId");


--
-- Name: ProjectContractChange_createdAt_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProjectContractChange_createdAt_idx" ON public."ProjectContractChange" USING btree ("createdAt");


--
-- Name: ProjectContract_code_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProjectContract_code_idx" ON public."ProjectContract" USING btree (code);


--
-- Name: ProjectContract_code_key; Type: INDEX; Schema: public; Owner: a1
--

CREATE UNIQUE INDEX "ProjectContract_code_key" ON public."ProjectContract" USING btree (code);


--
-- Name: ProjectContract_customerId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProjectContract_customerId_idx" ON public."ProjectContract" USING btree ("customerId");


--
-- Name: ProjectContract_projectId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProjectContract_projectId_idx" ON public."ProjectContract" USING btree ("projectId");


--
-- Name: ProjectContract_status_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProjectContract_status_idx" ON public."ProjectContract" USING btree (status);


--
-- Name: ProjectExpense_category_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProjectExpense_category_idx" ON public."ProjectExpense" USING btree (category);


--
-- Name: ProjectExpense_expenseDate_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProjectExpense_expenseDate_idx" ON public."ProjectExpense" USING btree ("expenseDate");


--
-- Name: ProjectExpense_projectId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProjectExpense_projectId_idx" ON public."ProjectExpense" USING btree ("projectId");


--
-- Name: ProjectStatusChange_createdAt_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProjectStatusChange_createdAt_idx" ON public."ProjectStatusChange" USING btree ("createdAt");


--
-- Name: ProjectStatusChange_projectId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "ProjectStatusChange_projectId_idx" ON public."ProjectStatusChange" USING btree ("projectId");


--
-- Name: Project_code_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "Project_code_idx" ON public."Project" USING btree (code);


--
-- Name: Project_code_key; Type: INDEX; Schema: public; Owner: a1
--

CREATE UNIQUE INDEX "Project_code_key" ON public."Project" USING btree (code);


--
-- Name: Project_customerId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "Project_customerId_idx" ON public."Project" USING btree ("customerId");


--
-- Name: Project_status_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "Project_status_idx" ON public."Project" USING btree (status);


--
-- Name: Region_code_key; Type: INDEX; Schema: public; Owner: a1
--

CREATE UNIQUE INDEX "Region_code_key" ON public."Region" USING btree (code);


--
-- Name: Region_isActive_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "Region_isActive_idx" ON public."Region" USING btree ("isActive");


--
-- Name: SalesExpense_expenseDate_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SalesExpense_expenseDate_idx" ON public."SalesExpense" USING btree ("expenseDate");


--
-- Name: SalesExpense_projectId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SalesExpense_projectId_idx" ON public."SalesExpense" USING btree ("projectId");


--
-- Name: SubcontractContract_approvalStatus_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SubcontractContract_approvalStatus_idx" ON public."SubcontractContract" USING btree ("approvalStatus");


--
-- Name: SubcontractContract_code_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SubcontractContract_code_idx" ON public."SubcontractContract" USING btree (code);


--
-- Name: SubcontractContract_code_key; Type: INDEX; Schema: public; Owner: a1
--

CREATE UNIQUE INDEX "SubcontractContract_code_key" ON public."SubcontractContract" USING btree (code);


--
-- Name: SubcontractContract_constructionId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SubcontractContract_constructionId_idx" ON public."SubcontractContract" USING btree ("constructionId");


--
-- Name: SubcontractContract_projectId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SubcontractContract_projectId_idx" ON public."SubcontractContract" USING btree ("projectId");


--
-- Name: SubcontractContract_status_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SubcontractContract_status_idx" ON public."SubcontractContract" USING btree (status);


--
-- Name: SubcontractContract_vendorId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SubcontractContract_vendorId_idx" ON public."SubcontractContract" USING btree ("vendorId");


--
-- Name: SubcontractPayment_approvalStatus_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SubcontractPayment_approvalStatus_idx" ON public."SubcontractPayment" USING btree ("approvalStatus");


--
-- Name: SubcontractPayment_contractId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SubcontractPayment_contractId_idx" ON public."SubcontractPayment" USING btree ("contractId");


--
-- Name: SubcontractPayment_paymentDate_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SubcontractPayment_paymentDate_idx" ON public."SubcontractPayment" USING btree ("paymentDate");


--
-- Name: SubcontractPayment_projectId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SubcontractPayment_projectId_idx" ON public."SubcontractPayment" USING btree ("projectId");


--
-- Name: SubcontractPayment_vendorId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SubcontractPayment_vendorId_idx" ON public."SubcontractPayment" USING btree ("vendorId");


--
-- Name: SubcontractVendor_code_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SubcontractVendor_code_idx" ON public."SubcontractVendor" USING btree (code);


--
-- Name: SubcontractVendor_code_key; Type: INDEX; Schema: public; Owner: a1
--

CREATE UNIQUE INDEX "SubcontractVendor_code_key" ON public."SubcontractVendor" USING btree (code);


--
-- Name: SubcontractVendor_name_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SubcontractVendor_name_idx" ON public."SubcontractVendor" USING btree (name);


--
-- Name: Supplier_code_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "Supplier_code_idx" ON public."Supplier" USING btree (code);


--
-- Name: Supplier_code_key; Type: INDEX; Schema: public; Owner: a1
--

CREATE UNIQUE INDEX "Supplier_code_key" ON public."Supplier" USING btree (code);


--
-- Name: Supplier_name_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "Supplier_name_idx" ON public."Supplier" USING btree (name);


--
-- Name: SystemUserOrgUnit_orgUnitId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SystemUserOrgUnit_orgUnitId_idx" ON public."SystemUserOrgUnit" USING btree ("orgUnitId");


--
-- Name: SystemUserOrgUnit_systemUserId_orgUnitId_key; Type: INDEX; Schema: public; Owner: a1
--

CREATE UNIQUE INDEX "SystemUserOrgUnit_systemUserId_orgUnitId_key" ON public."SystemUserOrgUnit" USING btree ("systemUserId", "orgUnitId");


--
-- Name: SystemUser_createdAt_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SystemUser_createdAt_idx" ON public."SystemUser" USING btree ("createdAt");


--
-- Name: SystemUser_dingUserId_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SystemUser_dingUserId_idx" ON public."SystemUser" USING btree ("dingUserId");


--
-- Name: SystemUser_dingUserId_key; Type: INDEX; Schema: public; Owner: a1
--

CREATE UNIQUE INDEX "SystemUser_dingUserId_key" ON public."SystemUser" USING btree ("dingUserId");


--
-- Name: SystemUser_isActive_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SystemUser_isActive_idx" ON public."SystemUser" USING btree ("isActive");


--
-- Name: SystemUser_role_idx; Type: INDEX; Schema: public; Owner: a1
--

CREATE INDEX "SystemUser_role_idx" ON public."SystemUser" USING btree (role);


--
-- Name: ConstructionApproval ConstructionApproval_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ConstructionApproval"
    ADD CONSTRAINT "ConstructionApproval_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public."ProjectContract"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ConstructionApproval ConstructionApproval_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ConstructionApproval"
    ADD CONSTRAINT "ConstructionApproval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ConstructionApproval ConstructionApproval_regionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ConstructionApproval"
    ADD CONSTRAINT "ConstructionApproval_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES public."Region"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ContractReceipt ContractReceipt_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ContractReceipt"
    ADD CONSTRAINT "ContractReceipt_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public."ProjectContract"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ContractReceipt ContractReceipt_regionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ContractReceipt"
    ADD CONSTRAINT "ContractReceipt_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES public."Region"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FormField FormField_formId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."FormField"
    ADD CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES public."FormDefinition"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LaborContract LaborContract_constructionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."LaborContract"
    ADD CONSTRAINT "LaborContract_constructionId_fkey" FOREIGN KEY ("constructionId") REFERENCES public."ConstructionApproval"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LaborContract LaborContract_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."LaborContract"
    ADD CONSTRAINT "LaborContract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LaborContract LaborContract_regionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."LaborContract"
    ADD CONSTRAINT "LaborContract_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES public."Region"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LaborContract LaborContract_workerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."LaborContract"
    ADD CONSTRAINT "LaborContract_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES public."LaborWorker"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LaborPayment LaborPayment_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."LaborPayment"
    ADD CONSTRAINT "LaborPayment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public."LaborContract"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LaborPayment LaborPayment_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."LaborPayment"
    ADD CONSTRAINT "LaborPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LaborPayment LaborPayment_regionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."LaborPayment"
    ADD CONSTRAINT "LaborPayment_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES public."Region"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LaborPayment LaborPayment_workerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."LaborPayment"
    ADD CONSTRAINT "LaborPayment_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES public."LaborWorker"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ManagementExpense ManagementExpense_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ManagementExpense"
    ADD CONSTRAINT "ManagementExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrganizationUnit OrganizationUnit_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."OrganizationUnit"
    ADD CONSTRAINT "OrganizationUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."OrganizationUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OtherPayment OtherPayment_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."OtherPayment"
    ADD CONSTRAINT "OtherPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OtherReceipt OtherReceipt_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."OtherReceipt"
    ADD CONSTRAINT "OtherReceipt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PettyCash PettyCash_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."PettyCash"
    ADD CONSTRAINT "PettyCash_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProcessInstance ProcessInstance_definitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcessInstance"
    ADD CONSTRAINT "ProcessInstance_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES public."ProcessDefinition"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProcessNode ProcessNode_definitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcessNode"
    ADD CONSTRAINT "ProcessNode_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES public."ProcessDefinition"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProcessTask ProcessTask_instanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcessTask"
    ADD CONSTRAINT "ProcessTask_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES public."ProcessInstance"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProcessTask ProcessTask_nodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcessTask"
    ADD CONSTRAINT "ProcessTask_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES public."ProcessNode"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProcurementContract ProcurementContract_constructionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcurementContract"
    ADD CONSTRAINT "ProcurementContract_constructionId_fkey" FOREIGN KEY ("constructionId") REFERENCES public."ConstructionApproval"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProcurementContract ProcurementContract_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcurementContract"
    ADD CONSTRAINT "ProcurementContract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProcurementContract ProcurementContract_regionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcurementContract"
    ADD CONSTRAINT "ProcurementContract_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES public."Region"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProcurementContract ProcurementContract_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcurementContract"
    ADD CONSTRAINT "ProcurementContract_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProcurementPayment ProcurementPayment_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcurementPayment"
    ADD CONSTRAINT "ProcurementPayment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public."ProcurementContract"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProcurementPayment ProcurementPayment_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcurementPayment"
    ADD CONSTRAINT "ProcurementPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProcurementPayment ProcurementPayment_regionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProcurementPayment"
    ADD CONSTRAINT "ProcurementPayment_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES public."Region"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProjectContractChange ProjectContractChange_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProjectContractChange"
    ADD CONSTRAINT "ProjectContractChange_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public."ProjectContract"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProjectContract ProjectContract_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProjectContract"
    ADD CONSTRAINT "ProjectContract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProjectContract ProjectContract_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProjectContract"
    ADD CONSTRAINT "ProjectContract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProjectContract ProjectContract_regionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProjectContract"
    ADD CONSTRAINT "ProjectContract_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES public."Region"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProjectExpense ProjectExpense_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProjectExpense"
    ADD CONSTRAINT "ProjectExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProjectStatusChange ProjectStatusChange_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."ProjectStatusChange"
    ADD CONSTRAINT "ProjectStatusChange_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Project Project_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Project Project_regionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES public."Region"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SalesExpense SalesExpense_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SalesExpense"
    ADD CONSTRAINT "SalesExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SubcontractContract SubcontractContract_constructionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SubcontractContract"
    ADD CONSTRAINT "SubcontractContract_constructionId_fkey" FOREIGN KEY ("constructionId") REFERENCES public."ConstructionApproval"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SubcontractContract SubcontractContract_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SubcontractContract"
    ADD CONSTRAINT "SubcontractContract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SubcontractContract SubcontractContract_regionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SubcontractContract"
    ADD CONSTRAINT "SubcontractContract_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES public."Region"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SubcontractContract SubcontractContract_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SubcontractContract"
    ADD CONSTRAINT "SubcontractContract_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public."SubcontractVendor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SubcontractPayment SubcontractPayment_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SubcontractPayment"
    ADD CONSTRAINT "SubcontractPayment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public."SubcontractContract"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SubcontractPayment SubcontractPayment_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SubcontractPayment"
    ADD CONSTRAINT "SubcontractPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SubcontractPayment SubcontractPayment_regionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SubcontractPayment"
    ADD CONSTRAINT "SubcontractPayment_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES public."Region"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SubcontractPayment SubcontractPayment_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SubcontractPayment"
    ADD CONSTRAINT "SubcontractPayment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public."SubcontractVendor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SystemUserOrgUnit SystemUserOrgUnit_orgUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SystemUserOrgUnit"
    ADD CONSTRAINT "SystemUserOrgUnit_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES public."OrganizationUnit"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SystemUserOrgUnit SystemUserOrgUnit_systemUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: a1
--

ALTER TABLE ONLY public."SystemUserOrgUnit"
    ADD CONSTRAINT "SystemUserOrgUnit_systemUserId_fkey" FOREIGN KEY ("systemUserId") REFERENCES public."SystemUser"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict mXk66jD7u7FkYc91SlbUepdR7LF9h8FLbfMBczRxIGwGgGYs2HvB8Ydrfbjldpb

