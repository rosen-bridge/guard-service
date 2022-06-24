import { DataSource, Repository } from "typeorm";
import { TssSignEntity } from "../../entities/sign/TssSignEntity";
import { signOrmDataSource } from "../../../../config/signOrmDataSource";

class TssSignDataBase {
    dataSource: DataSource;
    tssSignRepository: Repository<TssSignEntity>;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.tssSignRepository = this.dataSource.getRepository(TssSignEntity);
    }

    /**
     * inserts a request to sign a Cardano tx
     * @param txId the transaction id
     * @param txBytes serialized bytes of the transaction
     */
    insertSignRequest = async (txId: string, txBytes: string): Promise<void> => {
        await this.tssSignRepository.createQueryBuilder()
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
        await this.tssSignRepository.createQueryBuilder()
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
        return await this.tssSignRepository.createQueryBuilder()
            .select()
            .where("txId = :id", {id: txId})
            .getOneOrFail()
            .then(res => res.txBytes)
    }

}

export const tssSignAction = new TssSignDataBase(signOrmDataSource)
