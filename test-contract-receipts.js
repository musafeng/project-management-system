/**
 * 合同收款 API 测试脚本
 */

const BASE_URL = 'http://localhost:3000'

async function testAPI() {
  console.log('🧪 开始测试合同收款 API...\n')

  try {
    // 1. 测试获取收款列表
    console.log('1️⃣ 测试 GET /api/contract-receipts')
    const listRes = await fetch(`${BASE_URL}/api/contract-receipts`)
    const listData = await listRes.json()
    console.log('✅ 状态:', listRes.status)
    console.log('📦 返回:', JSON.stringify(listData, null, 2))
    console.log('')

    // 2. 获取一个合同用于测试
    console.log('2️⃣ 获取测试合同')
    const contractsRes = await fetch(`${BASE_URL}/api/project-contracts`)
    const contractsData = await contractsRes.json()
    
    if (!contractsData.success || !contractsData.data || contractsData.data.length === 0) {
      console.log('⚠️  没有可用的合同，请先创建项目和合同')
      return
    }
    
    const testContract = contractsData.data[0]
    console.log('✅ 使用合同:', testContract.code, '-', testContract.name)
    console.log('💰 应收金额:', testContract.receivableAmount)
    console.log('💵 已收金额:', testContract.receivedAmount)
    console.log('📊 未收金额:', testContract.unreceivedAmount)
    console.log('')

    // 3. 创建收款记录
    console.log('3️⃣ 测试 POST /api/contract-receipts')
    const createRes = await fetch(`${BASE_URL}/api/contract-receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractId: testContract.id,
        amount: 50000,
        receiptDate: new Date().toISOString(),
        remark: '首期收款',
      }),
    })
    const createData = await createRes.json()
    console.log('✅ 状态:', createRes.status)
    console.log('📦 返回:', JSON.stringify(createData, null, 2))
    console.log('')

    if (!createData.success) {
      console.log('❌ 创建失败')
      return
    }

    const receiptId = createData.data.id

    // 4. 获取收款详情
    console.log('4️⃣ 测试 GET /api/contract-receipts/{id}')
    const detailRes = await fetch(`${BASE_URL}/api/contract-receipts/${receiptId}`)
    const detailData = await detailRes.json()
    console.log('✅ 状态:', detailRes.status)
    console.log('📦 返回:', JSON.stringify(detailData, null, 2))
    console.log('')

    // 5. 验证合同汇总字段是否更新
    console.log('5️⃣ 验证合同汇总字段更新')
    const updatedContractRes = await fetch(`${BASE_URL}/api/project-contracts/${testContract.id}`)
    const updatedContractData = await updatedContractRes.json()
    if (updatedContractData.success) {
      console.log('✅ 更新后的合同信息:')
      console.log('💵 已收金额:', updatedContractData.data.receivedAmount)
      console.log('📊 未收金额:', updatedContractData.data.unreceivedAmount)
    }
    console.log('')

    // 6. 删除收款记录
    console.log('6️⃣ 测试 DELETE /api/contract-receipts/{id}')
    const deleteRes = await fetch(`${BASE_URL}/api/contract-receipts/${receiptId}`, {
      method: 'DELETE',
    })
    const deleteData = await deleteRes.json()
    console.log('✅ 状态:', deleteRes.status)
    console.log('📦 返回:', JSON.stringify(deleteData, null, 2))
    console.log('')

    // 7. 验证删除后合同汇总字段是否回退
    console.log('7️⃣ 验证删除后合同汇总字段回退')
    const finalContractRes = await fetch(`${BASE_URL}/api/project-contracts/${testContract.id}`)
    const finalContractData = await finalContractRes.json()
    if (finalContractData.success) {
      console.log('✅ 回退后的合同信息:')
      console.log('💵 已收金额:', finalContractData.data.receivedAmount)
      console.log('📊 未收金额:', finalContractData.data.unreceivedAmount)
    }
    console.log('')

    console.log('✅ 所有测试完成！')
  } catch (err) {
    console.error('❌ 测试失败:', err.message)
  }
}

testAPI()





