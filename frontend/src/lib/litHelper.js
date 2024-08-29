import { disconnectWeb3, encryptString, decryptToString, LitNodeClient } from "@lit-protocol/lit-node-client";
import { Wallet } from "ethers";
import {
    LitActionResource,
    LitAccessControlConditionResource,
    LitAbility,
    createSiweMessageWithRecaps,
    generateAuthSig,
} from "@lit-protocol/auth-helpers"
import LitJsSdk from "@lit-protocol/lit-node-client";
import { LitNetwork } from "@lit-protocol/constants";

export class Lit {
    litNodeClient;
    accessControlConditions;
    chain;

    constructor(client, chain, accessControlConditions) {
        this.litNodeClient = client;
        this.chain = chain;
        this.accessControlConditions = accessControlConditions;
    }

    async connect() {
        // disconnectWeb3();
        await this.litNodeClient.connect()
    }

    async disconnect() {
        await this.litNodeClient.disconnect()
    }

    async getSessionSigsServer() {
        const walletWithCapacityCredit = new Wallet(
            process.env.NEXT_PUBLIC_ETHEREUM_WALLET_A_PRIVATE_KEY
        );
        const latestBlockhash = await this.litNodeClient.getLatestBlockhash();

        const authNeededCallback = async (params) => {
            if (!params.uri) {
                throw new Error("uri is required");
            }
            if (!params.expiration) {
                throw new Error("expiration is required");
            }

            if (!params.resourceAbilityRequests) {
                throw new Error("resourceAbilityRequests is required");
            }

            const toSign = await createSiweMessageWithRecaps({
                uri: params.uri,
                expiration: params.expiration,
                resources: params.resourceAbilityRequests,
                walletAddress: walletWithCapacityCredit.address,
                nonce: latestBlockhash,
                litNodeClient: this.litNodeClient,
            });

            const authSig = await generateAuthSig({
                signer: walletWithCapacityCredit,
                toSign,
            });
            // console.log("authSig:", authSig);
            return authSig;
        }

        // const litResource = new LitAccessControlConditionResource('*');

        const sessionSigs = await this.litNodeClient.getSessionSigs({
            chain: this.chain,
            resourceAbilityRequests: [
                {
                    resource: new LitActionResource('*'),
                    ability: LitAbility.LitActionExecution,
                },
                {
                    resource: new LitAccessControlConditionResource('*'),
                    ability: LitAbility.AccessControlConditionDecryption,
                }
            ],
            authNeededCallback,
        });
        console.log("sessionSigs:", sessionSigs);
        return sessionSigs
    }

    async encrypt(message) {
        console.log("encrypting message: ", message, typeof message);
        const sessionSigs = await this.getSessionSigsServer();
        console.log(sessionSigs)
        const { ciphertext, dataToEncryptHash } = await encryptString(
            {
                accessControlConditions: this.accessControlConditions,
                chain: this.chain,
                dataToEncrypt: message,
                sessionSigs,
            },
            this.litNodeClient,
        );
        return {
            ciphertext,
            dataToEncryptHash,
        };
    }

    async decrypt(ciphertext, dataToEncryptHash) {
        const sessionSigs = await this.getSessionSigsServer();
        const decryptedString = await decryptToString(
            {
                accessControlConditions: [this.accessControlConditions],
                chain: this.chain,
                ciphertext,
                dataToEncryptHash,
                sessionSigs,
            },
            this.litNodeClient,
        );
        return { decryptedString }
    }

    async decryptLitAction(ciphertext, dataToEncryptHash, mode) {
        const sessionSigs = await this.getSessionSigsServer();

        const code = `(async () => {
            console.log("hello");
            const privateKey = await Lit.Actions.decryptAndCombine({
              accessControlConditions,
              chain: "ethereum",
              ciphertext,
              dataToEncryptHash,
              authSig: null,
              sessionSigs
            });
            console.log("privateKey: ", privateKey);
            Lit.Actions.setResponse({ response: privateKey });
          })();`

        // // Decrypt the private key inside a lit action
        const res = await this.litNodeClient.executeJs({
            sessionSigs,
            code: code,
            // code: genActionSource2(),
            jsParams: {
                accessControlConditions: this.accessControlConditions,
                ciphertext,
                dataToEncryptHash,
                sessionSigs,
            }
        });
        console.log("result from action execution:", res);

        return res.response;
    }
}

export const encryptRunServerMode = async (message) => {
    const client = new LitJsSdk.LitNodeClient({
        litNetwork: LitNetwork.DatilDev,
        debug: true,
    });

    const chain = "ethereum";

    const accessControlConditions = [
        {
            contractAddress: '0x6cD23FB64f122705AbeE7305Eef346Bb10175491',
            standardContractType: 'ERC20',
            chain: "polygon",
            method: 'balanceOf',
            parameters: [
                ':userAddress'
            ],
            returnValueTest: {
                comparator: '>',
                value: '0'
            }
        }
    ]

    let myLit = new Lit(client, chain, accessControlConditions);
    await myLit.connect();

    const { ciphertext, dataToEncryptHash } = await myLit.encrypt(message, "server");
    console.log("ciphertext: ", ciphertext);
    console.log("dataToEncryptHash: ", dataToEncryptHash);

    return (ciphertext, dataToEncryptHash)
    // const data = await myLit.decryptLitAction(ciphertext, dataToEncryptHash, "server");
    // console.log("decrypted data: ", data);

    await myLit.disconnect();
}


export const decryptRunServerMode = async (dataToEncryptHash, ciphertext) => {
    const client = new LitJsSdk.LitNodeClient({
        litNetwork: LitNetwork.DatilDev,
        debug: true,
    });

    const chain = "ethereum";

    const accessControlConditions = [
        {
            contractAddress: '0x6cD23FB64f122705AbeE7305Eef346Bb10175491',
            standardContractType: 'ERC20',
            chain: "polygon",
            method: 'balanceOf',
            parameters: [
                ':userAddress'
            ],
            returnValueTest: {
                comparator: '>',
                value: '0'
            }
        }
    ]

    let myLit = new Lit(client, chain, accessControlConditions);
    await myLit.connect();

    const data = await myLit.decryptLitAction(ciphertext, dataToEncryptHash, "server");
    console.log("decrypted data: ", data);

    return (data)
    // const data = await myLit.decryptLitAction(ciphertext, dataToEncryptHash, "server");
    // console.log("decrypted data: ", data);

    await myLit.disconnect();
}