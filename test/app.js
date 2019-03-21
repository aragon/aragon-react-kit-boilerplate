const TokenManager = artifacts.require('TokenManager')
const MiniMeToken = artifacts.require('MiniMeToken')
const DAOFactory = artifacts.require('@aragon/core/contracts/factory/DAOFactory')
const EVMScriptRegistryFactory = artifacts.require('@aragon/core/contracts/factory/EVMScriptRegistryFactory')
const ACL = artifacts.require('@aragon/core/contracts/acl/ACL')
const Kernel = artifacts.require('@aragon/core/contracts/kernel/Kernel')

const EtherTokenConstantMock = artifacts.require('EtherTokenConstantMock')

const getContract = name => artifacts.require(name)

const n = '0x00'
const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'

contract('Token Manager', accounts => {
    let tokenManagerBase, daoFact, tokenManager, token

    let APP_MANAGER_ROLE
    let MINT_ROLE, ISSUE_ROLE, ASSIGN_ROLE, REVOKE_VESTINGS_ROLE, BURN_ROLE
    let ETH

    const root = accounts[0]

    before(async () => {
        const kernelBase = await getContract('Kernel').new(true) // petrify immediately
        const aclBase = await getContract('ACL').new()
        const regFact = await EVMScriptRegistryFactory.new()
        daoFact = await DAOFactory.new(kernelBase.address, aclBase.address, regFact.address)
        tokenManagerBase = await TokenManager.new()

        // Setup constants
        APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
        MINT_ROLE = await tokenManagerBase.MINT_ROLE()
        ISSUE_ROLE = await tokenManagerBase.ISSUE_ROLE()
        ASSIGN_ROLE = await tokenManagerBase.ASSIGN_ROLE()
        REVOKE_VESTINGS_ROLE = await tokenManagerBase.REVOKE_VESTINGS_ROLE()
        BURN_ROLE = await tokenManagerBase.BURN_ROLE()

        const ethConstant = await EtherTokenConstantMock.new()
        ETH = await ethConstant.getETHConstant()
    })

    beforeEach(async () => {
        const r = await daoFact.newDAO(root)
        const dao = await Kernel.at(r.logs.filter(l => l.event == 'DeployDAO')[0].args.dao)
        const acl = await ACL.at(await dao.acl())

        await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root, { from: root })

        const receipt = await dao.newAppInstance('0x1234', tokenManagerBase.address, '0x', false, { from: root })
        tokenManager = TokenManager.at(receipt.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)

        await acl.createPermission(ANY_ADDR, tokenManager.address, MINT_ROLE, root, { from: root })
        await acl.createPermission(ANY_ADDR, tokenManager.address, ISSUE_ROLE, root, { from: root })
        await acl.createPermission(ANY_ADDR, tokenManager.address, ASSIGN_ROLE, root, { from: root })
        await acl.createPermission(ANY_ADDR, tokenManager.address, REVOKE_VESTINGS_ROLE, root, { from: root })
        await acl.createPermission(ANY_ADDR, tokenManager.address, BURN_ROLE, root, { from: root })

        token = await MiniMeToken.new(n, n, 0, 'n', 0, 'n', true)
    })

    it('checks it is forwarder', async () => {
        assert.isTrue(await tokenManager.isForwarder())
    })

    it('initializating as transferable sets the token as transferable', async () => {
        const transferable = true
        await token.enableTransfers(!transferable)

        await token.changeController(tokenManager.address)
        await tokenManager.initialize(token.address, transferable, 0)
        assert.equal(transferable, await token.transfersEnabled())
    })
})