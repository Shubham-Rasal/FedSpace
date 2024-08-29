import LitJsSdk from "@lit-protocol/lit-node-client";
import { LitNetwork } from "@lit-protocol/constants";
import { disconnectWeb3, encryptString, decryptToString, LitNodeClient } from "@lit-protocol/lit-node-client";
import { Wallet } from "ethers";
import {
    LitActionResource,
    LitAccessControlConditionResource,
    LitAbility,
    createSiweMessageWithRecaps,
    generateAuthSig,
} from "@lit-protocol/auth-helpers"

class Lit {
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
            process.env.ETHEREUM_WALLET_A_PRIVATE_KEY
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
        const sessionSigs = await this.getSessionSigsServer();
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

export async function POST(req) {

    const { dataCid } = await req.json()
    console.log(dataCid)

    try {

        const client = new LitJsSdk.LitNodeClient({
            litNetwork: LitNetwork.DatilDev,
            debug: true,
        });

        const chain = "ethereum";

        const accessControlConditions = [
            {
                contractAddress: "",
                standardContractType: "",
                chain,
                method: "",
                parameters: [":userAddress", "latest"],
                returnValueTest: {
                    comparator: "=",
                    value: process.env.ETHEREUM_WALLET_A_PUBLIC_KEY,
                },
            },
        ];

        const message = dataCid;

        let myLit = new Lit(client, chain, accessControlConditions);
        await myLit.connect();

        const { ciphertext, dataToEncryptHash } = await myLit.encrypt(message, "server");

        return Response.json({ message: 'encryption successfull', ciphertext: ciphertext, dataToEncryptHash: dataToEncryptHash }, { status: 200 });

        await myLit.disconnect();
    } catch (error) {
        console.error(error);
        return Response.json({ error: 'error encrypting data' }, { status: 500 });
    }
}