import express from 'express';
import * as grpc from '@grpc/grpc-js';

import {
    connect,
    hash,
    signers
} from '@hyperledger/fabric-gateway';

import {
    promises as fs
} from 'fs';

import {
    createPrivateKey
} from 'crypto';

import path from 'path';


const app = express();

app.use(express.json());


const PORT = 3001;

const CHANNEL_NAME = 'remitxchannel';

const CHAINCODE_NAME = 'remitx-settlement';

const MSP_ID = 'Org1MSP';

const PEER_ENDPOINT = 'localhost:7051';

const PEER_HOST_ALIAS = 'peer0.org1.example.com';


const PROJECT_ROOT = path.resolve(
    process.cwd(),
    '..',
    '..'
);


const ORG1_CRYPTO_PATH = path.join(
    PROJECT_ROOT,
    'external',
    'drunix',
    'drunix-network',
    'test-network',
    'organizations',
    'peerOrganizations',
    'org1.example.com'
);


const CERT_DIRECTORY_PATH = path.join(
    ORG1_CRYPTO_PATH,
    'users',
    'Admin@org1.example.com',
    'msp',
    'signcerts'
);


const KEY_DIRECTORY_PATH = path.join(
    ORG1_CRYPTO_PATH,
    'users',
    'Admin@org1.example.com',
    'msp',
    'keystore'
);


const TLS_CERT_PATH = path.join(
    ORG1_CRYPTO_PATH,
    'peers',
    'peer0.org1.example.com',
    'tls',
    'ca.crt'
);


async function getFirstFile(directoryPath) {

    const files = await fs.readdir(
        directoryPath
    );

    if (files.length === 0) {
        throw new Error(
            `No files found in ${directoryPath}`
        );
    }

    return path.join(
        directoryPath,
        files[0]
    );
}


async function newGrpcConnection() {

    const tlsRootCert =
        await fs.readFile(
            TLS_CERT_PATH
        );

    const tlsCredentials =
        grpc.credentials.createSsl(
            tlsRootCert
        );

    return new grpc.Client(
        PEER_ENDPOINT,
        tlsCredentials,
        {
            'grpc.ssl_target_name_override':
                PEER_HOST_ALIAS
        }
    );
}


async function newIdentity() {

    const certPath =
        await getFirstFile(
            CERT_DIRECTORY_PATH
        );

    const credentials =
        await fs.readFile(
            certPath
        );

    return {
        mspId: MSP_ID,
        credentials
    };
}


async function newSigner() {

    const keyPath =
        await getFirstFile(
            KEY_DIRECTORY_PATH
        );

    const privateKeyPem =
        await fs.readFile(
            keyPath
        );

    const privateKey =
        createPrivateKey(
            privateKeyPem
        );

    return signers.newPrivateKeySigner(
        privateKey
    );
}


async function createGatewayConnection() {

    const client =
        await newGrpcConnection();

    const identity =
        await newIdentity();

    const signer =
        await newSigner();

    const gateway = connect({
        client,
        identity,
        signer,
        hash: hash.sha256
    });

    return {
        gateway,
        client
    };
}


function validateSettlementRequest(body) {

    const requiredFields = [
        'transactionId',
        'senderCountry',
        'beneficiaryCountry',
        'sourceCurrency',
        'sourceAmount',
        'destinationCurrency',
        'destinationAmount',
        'fxRate',
        'riskStatus',
        'routeId'
    ];

    const missingFields =
        requiredFields.filter(
            field =>
                body[field] === undefined ||
                body[field] === null ||
                body[field] === ''
        );

    if (missingFields.length > 0) {
        throw new Error(
            `Missing required fields: ${missingFields.join(', ')}`
        );
    }

    const sourceAmount =
        Number(body.sourceAmount);

    const destinationAmount =
        Number(body.destinationAmount);

    const fxRate =
        Number(body.fxRate);

    if (
        !Number.isFinite(sourceAmount) ||
        sourceAmount <= 0
    ) {
        throw new Error(
            'sourceAmount must be a positive number'
        );
    }

    if (
        !Number.isFinite(destinationAmount) ||
        destinationAmount <= 0
    ) {
        throw new Error(
            'destinationAmount must be a positive number'
        );
    }

    if (
        !Number.isFinite(fxRate) ||
        fxRate <= 0
    ) {
        throw new Error(
            'fxRate must be a positive number'
        );
    }

    if (body.riskStatus !== 'APPROVED') {
        throw new Error(
            'Only APPROVED settlements can be submitted to Drunix'
        );
    }
}


app.get(
    '/health',
    async (req, res) => {

        try {

            await fs.access(
                TLS_CERT_PATH
            );

            const certPath =
                await getFirstFile(
                    CERT_DIRECTORY_PATH
                );

            const keyPath =
                await getFirstFile(
                    KEY_DIRECTORY_PATH
                );

            res.json({
                status: 'UP',
                service:
                    'REMITX Drunix Gateway',
                channel:
                    CHANNEL_NAME,
                chaincode:
                    CHAINCODE_NAME,
                peer:
                    PEER_ENDPOINT,
                msp:
                    MSP_ID,
                credentialsAvailable: true,
                credentialPaths: {
                    tlsCertificate:
                        TLS_CERT_PATH,
                    identityCertificate:
                        certPath,
                    privateKey:
                        keyPath
                }
            });

        } catch (error) {

            res.status(500).json({
                status: 'DOWN',
                error:
                    error.message
            });
        }
    }
);


app.post(
    '/api/drunix/settlements',
    async (req, res) => {

        let gatewayConnection;

        try {

            validateSettlementRequest(
                req.body
            );

            gatewayConnection =
                await createGatewayConnection();

            const network =
                gatewayConnection.gateway
                    .getNetwork(
                        CHANNEL_NAME
                    );

            const contract =
                network.getContract(
                    CHAINCODE_NAME
                );

            const result =
                await contract.submitTransaction(
                    'CreateSettlement',

                    String(
                        req.body.transactionId
                    ),

                    String(
                        req.body.senderCountry
                    ),

                    String(
                        req.body.beneficiaryCountry
                    ),

                    String(
                        req.body.sourceCurrency
                    ),

                    String(
                        req.body.sourceAmount
                    ),

                    String(
                        req.body.destinationCurrency
                    ),

                    String(
                        req.body.destinationAmount
                    ),

                    String(
                        req.body.fxRate
                    ),

                    String(
                        req.body.riskStatus
                    ),

                    String(
                        req.body.routeId
                    )
                );

            const settlement =
                JSON.parse(
                    Buffer.from(
                        result
                    ).toString(
                        'utf8'
                    )
                );

            res.status(201).json({
                success: true,
                message:
                    'Settlement committed to Drunix',
                settlement
            });

        } catch (error) {

            console.error(
                'Drunix settlement submission failed:',
                error
            );

            const message =
                error.message ||
                'Unknown Drunix error';

            const isValidationError =
                message.startsWith(
                    'Missing required fields'
                ) ||
                message.includes(
                    'must be a positive number'
                ) ||
                message.includes(
                    'Only APPROVED settlements'
                );

            res.status(
                isValidationError
                    ? 400
                    : 500
            ).json({
                success: false,
                error: message
            });

        } finally {

            if (gatewayConnection) {

                gatewayConnection.gateway
                    .close();

                gatewayConnection.client
                    .close();
            }
        }
    }
);


app.get(
    '/api/drunix/settlements/:transactionId',
    async (req, res) => {

        let gatewayConnection;

        try {

            gatewayConnection =
                await createGatewayConnection();

            const network =
                gatewayConnection.gateway
                    .getNetwork(
                        CHANNEL_NAME
                    );

            const contract =
                network.getContract(
                    CHAINCODE_NAME
                );

            const result =
                await contract.evaluateTransaction(
                    'GetSettlement',
                    req.params.transactionId
                );

            const settlement =
                JSON.parse(
                    Buffer.from(
                        result
                    ).toString(
                        'utf8'
                    )
                );

            res.json({
                success: true,
                settlement
            });

        } catch (error) {

            console.error(
                'Drunix query failed:',
                error
            );

            res.status(500).json({
                success: false,
                error:
                    error.message
            });

        } finally {

            if (gatewayConnection) {

                gatewayConnection.gateway
                    .close();

                gatewayConnection.client
                    .close();
            }
        }
    }
);


app.get(
    '/api/drunix/settlements/:transactionId/history',
    async (req, res) => {

        let gatewayConnection;

        try {

            gatewayConnection =
                await createGatewayConnection();

            const network =
                gatewayConnection.gateway
                    .getNetwork(
                        CHANNEL_NAME
                    );

            const contract =
                network.getContract(
                    CHAINCODE_NAME
                );

            const result =
                await contract.evaluateTransaction(
                    'GetSettlementHistory',
                    req.params.transactionId
                );

            const history =
                JSON.parse(
                    Buffer.from(
                        result
                    ).toString(
                        'utf8'
                    )
                );

            res.json({
                success: true,
                transactionId:
                    req.params.transactionId,
                eventCount:
                    history.length,
                history
            });

        } catch (error) {

            console.error(
                'Drunix history query failed:',
                error
            );

            res.status(500).json({
                success: false,
                error:
                    error.message
            });

        } finally {

            if (gatewayConnection) {

                gatewayConnection.gateway
                    .close();

                gatewayConnection.client
                    .close();
            }
        }
    }
);


app.listen(
    PORT,
    () => {

        console.log(
            '======================================'
        );

        console.log(
            'REMITX Drunix Gateway'
        );

        console.log(
            '======================================'
        );

        console.log(
            `Listening on http://localhost:${PORT}`
        );

        console.log(
            `Channel: ${CHANNEL_NAME}`
        );

        console.log(
            `Chaincode: ${CHAINCODE_NAME}`
        );

        console.log(
            `Peer: ${PEER_ENDPOINT}`
        );

        console.log(
            `MSP: ${MSP_ID}`
        );

        console.log(
            '======================================'
        );
    }
);