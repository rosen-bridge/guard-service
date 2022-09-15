import fs from "fs"
import ErgoUtils from "../chains/ergo/helpers/ErgoUtils"
import { Contract } from "ergo-lib-wasm-nodejs"
import Configs from "./Configs"
import { logger } from "../log/Logger";

class ContractConfig {
    readonly cleanupNFT: string
    readonly cleanupConfirm: number
    readonly permitAddress: string
    readonly permitErgoTree: string
    readonly permitContract: Contract
    readonly eventTriggerAddress: string
    readonly eventTriggerErgoTree: string
    readonly eventTriggerContract: Contract
    readonly commitmentAddress: string
    readonly commitmentErgoTree: string
    readonly commitmentContract: Contract
    readonly lockAddress: string
    readonly RepoNFT: string
    readonly RWTId: string

    constructor(path: string) {
        if (!fs.existsSync(path)) {
            logger.log('fatal', `networkConfig file doesn't exist with reported path`, {path: path})
            throw new Error(`networkConfig file with path ${path} doesn't exist`)
        } else {
            const configJson: string = fs.readFileSync(path, 'utf8')
            const config = JSON.parse(configJson)
            this.cleanupNFT = config.tokens.CleanupNFT
            this.cleanupConfirm = config.cleanupConfirm
            this.permitAddress = config.addresses.WatcherPermit
            this.permitErgoTree = ErgoUtils.addressStringToErgoTreeString(this.permitAddress)
            this.permitContract = ErgoUtils.addressStringToContract(this.permitAddress)
            this.eventTriggerAddress = config.addresses.WatcherTriggerEvent
            this.eventTriggerErgoTree = ErgoUtils.addressStringToErgoTreeString(this.eventTriggerAddress)
            this.eventTriggerContract = ErgoUtils.addressStringToContract(this.eventTriggerAddress)
            this.commitmentAddress = config.addresses.Commitment
            this.commitmentErgoTree = ErgoUtils.addressStringToErgoTreeString(this.commitmentAddress)
            this.commitmentContract = ErgoUtils.addressStringToContract(this.commitmentAddress)
            this.lockAddress = config.addresses.lock
            this.RepoNFT = config.tokens.RepoNFT
            this.RWTId = config.tokens.RWTId
        }
    }
}

class RosenConfig {
    readonly RSN: string
    readonly guardNFT: string
    readonly rsnRatioNFT: string
    readonly contracts: Map<string, ContractConfig>

    constructor() {
        const supportingNetworks = Configs.networks
        this.contracts = new Map<string, ContractConfig>()
        const rosenConfigPath = this.getAddress(supportingNetworks[0])
        if (!fs.existsSync(rosenConfigPath)) {
            logger.log('fatal', `rosenConfig with reported path doesn't exist`, {path: rosenConfigPath})
            throw new Error(`rosenConfig file with path ${rosenConfigPath} doesn't exist`)
        } else {
            const configJson: string = fs.readFileSync(rosenConfigPath, 'utf8')
            const config = JSON.parse(configJson)
            this.RSN = config.tokens.RSN
            this.guardNFT = config.tokens.GuardNFT
            this.rsnRatioNFT = config.tokens.RsnRatioNFT
        }
        supportingNetworks.forEach(network => {
            const networkName = network.split("-")[0].toLowerCase()
            const contractConfig = new ContractConfig(this.getAddress(network))
            this.contracts.set(networkName, contractConfig)
        })
    }

    /**
     * returns the address of contractConfig for the related network
     * @param network
     */
    getAddress = (network: string) => {
        return Configs.addressesBasePath + `contracts-${network}.json`
    }

    /**
     * Returns the ContractConfig of the related network
     * @param network
     */
    contractReader = (network: string) => {
        const contracts = this.contracts.get(network)
        if(!contracts){
            logger.log('fatal', `contract and token config is not set for network`, {network: network})
            throw Error(`${network} contracts and token config is not set`)
        }
        return contracts
    }
}


export const rosenConfig = new RosenConfig()
export { ContractConfig, RosenConfig }
