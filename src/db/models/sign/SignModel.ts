import { DataSource, Repository } from "typeorm";
import { CardanoSignEntity } from "../../entities/sign/CardanoSignEntity";
import { signOrmDataSource } from "../../../../config/signOrmDataSource";

class SignDataBase {
    dataSource: DataSource;
    CardanoSignRepository: Repository<CardanoSignEntity>;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.CardanoSignRepository = this.dataSource.getRepository(CardanoSignEntity);
    }

    /**
     * inserts a request to sign a Cardano tx
     * @param txId the transaction id
     * @param txBytes serialized bytes of the transaction
     */
    insertSignRequest = async (txId: string, txBytes: string): Promise<void> => {
        await this.CardanoSignRepository.createQueryBuilder()
            .insert()
            .values({
                txId: txId,
                txBytes: txBytes,
                signedHash: ""
            })
            .execute()
    }

    /**
     * updates the signature for a request
     * @param txId the transaction id
     * @param signedTxBytes serialized bytes of the signed transaction
     * @param signature the signature
     */
    updateSignature = async (txId: string, signedTxBytes: string, signature: string): Promise<void> => {
        await this.CardanoSignRepository.createQueryBuilder()
            .update()
            .set({
                txBytes: signedTxBytes,
                signedHash: signature
            })
            .where("txId = :id", {id: txId})
            .execute()
    }

    /**
     * @param txId the transaction id
     * @return serialized bytes of the transaction
     */
    getTxById = async (txId: string): Promise<string> => {
        return await this.CardanoSignRepository.createQueryBuilder()
            .select()
            .where("txId = :id", {id: txId})
            .getOneOrFail()
            .then(res => res.txBytes)
    }

}

const tssSignAction = new SignDataBase(signOrmDataSource)

export {
    SignDataBase,
    tssSignAction
}
