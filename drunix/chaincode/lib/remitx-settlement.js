'use strict';

const { Contract } = require('fabric-contract-api');
const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');

class RemitXSettlement extends Contract {

    async SettlementExists(ctx, transactionId) {
        const settlementJSON = await ctx.stub.getState(transactionId);

        return Boolean(
            settlementJSON &&
            settlementJSON.length > 0
        );
    }


    getTimestamp(ctx) {
        const timestamp = ctx.stub.getTxTimestamp();

        const seconds = Number(
            timestamp.seconds.toString()
        );

        const nanos = Number(
            timestamp.nanos
        );

        return new Date(
            (seconds * 1000) +
            Math.floor(nanos / 1000000)
        ).toISOString();
    }


    async createAuditEvent(
        ctx,
        transactionId,
        eventNumber,
        eventType,
        settlementStatus
    ) {
        const timestamp = this.getTimestamp(ctx);

        const eventKey = ctx.stub.createCompositeKey(
            'remitxAudit',
            [
                transactionId,
                String(eventNumber).padStart(6, '0')
            ]
        );

        const auditEvent = {
            docType: 'remitxAuditEvent',
            transactionId: transactionId,
            eventNumber: eventNumber,
            eventType: eventType,
            settlementStatus: settlementStatus,
            ledgerTxId: ctx.stub.getTxID(),
            timestamp: timestamp
        };

        await ctx.stub.putState(
            eventKey,
            Buffer.from(
                stringify(
                    sortKeysRecursive(auditEvent)
                )
            )
        );

        return auditEvent;
    }


    async CreateSettlement(
        ctx,
        transactionId,
        senderCountry,
        beneficiaryCountry,
        sourceCurrency,
        sourceAmount,
        destinationCurrency,
        destinationAmount,
        fxRate,
        riskStatus,
        routeId
    ) {
        const exists = await this.SettlementExists(
            ctx,
            transactionId
        );

        if (exists) {
            throw new Error(
                `Settlement ${transactionId} already exists`
            );
        }

        const createdAt = this.getTimestamp(ctx);

        const settlement = {
            docType: 'remitxSettlement',

            transactionId: transactionId,

            senderCountry: senderCountry,
            beneficiaryCountry: beneficiaryCountry,

            sourceCurrency: sourceCurrency,
            sourceAmount: Number(sourceAmount),

            destinationCurrency: destinationCurrency,
            destinationAmount: Number(destinationAmount),

            fxRate: Number(fxRate),

            riskStatus: riskStatus,
            routeId: routeId,

            settlementStatus: 'DRUNIX_COMMITTED',

            eventSequence: 1,

            createdAt: createdAt,
            updatedAt: createdAt
        };

        await ctx.stub.putState(
            transactionId,
            Buffer.from(
                stringify(
                    sortKeysRecursive(settlement)
                )
            )
        );

        await this.createAuditEvent(
            ctx,
            transactionId,
            1,
            'SETTLEMENT_CREATED',
            'DRUNIX_COMMITTED'
        );

        return JSON.stringify(settlement);
    }


    async GetSettlement(
        ctx,
        transactionId
    ) {
        const settlementJSON =
            await ctx.stub.getState(transactionId);

        if (
            !settlementJSON ||
            settlementJSON.length === 0
        ) {
            throw new Error(
                `Settlement ${transactionId} does not exist`
            );
        }

        return settlementJSON.toString();
    }


    async UpdateSettlementStatus(
        ctx,
        transactionId,
        newStatus
    ) {
        const settlementJSON =
            await ctx.stub.getState(transactionId);

        if (
            !settlementJSON ||
            settlementJSON.length === 0
        ) {
            throw new Error(
                `Settlement ${transactionId} does not exist`
            );
        }

        const settlement = JSON.parse(
            settlementJSON.toString()
        );

        const allowedStatuses = [
            'DRUNIX_COMMITTED',
            'SETTLEMENT_PROCESSING',
            'SETTLED',
            'PAYOUT_COMPLETED',
            'SETTLEMENT_FAILED'
        ];

        if (!allowedStatuses.includes(newStatus)) {
            throw new Error(
                `Invalid settlement status: ${newStatus}`
            );
        }

        const previousStatus =
            settlement.settlementStatus;

        if (previousStatus === newStatus) {
            throw new Error(
                `Settlement ${transactionId} is already ${newStatus}`
            );
        }

        const updatedAt =
            this.getTimestamp(ctx);

        const currentSequence =
            Number(settlement.eventSequence || 0);

        const nextSequence =
            currentSequence + 1;

        settlement.settlementStatus =
            newStatus;

        settlement.eventSequence =
            nextSequence;

        settlement.updatedAt =
            updatedAt;

        await ctx.stub.putState(
            transactionId,
            Buffer.from(
                stringify(
                    sortKeysRecursive(settlement)
                )
            )
        );

        await this.createAuditEvent(
            ctx,
            transactionId,
            nextSequence,
            'STATUS_CHANGED',
            newStatus
        );

        return JSON.stringify(settlement);
    }


    async GetSettlementHistory(
        ctx,
        transactionId
    ) {
        const exists =
            await this.SettlementExists(
                ctx,
                transactionId
            );

        if (!exists) {
            throw new Error(
                `Settlement ${transactionId} does not exist`
            );
        }

        const iterator =
            await ctx.stub.getStateByPartialCompositeKey(
                'remitxAudit',
                [transactionId]
            );

        const history = [];

        while (true) {
            const result =
                await iterator.next();

            if (
                result.value &&
                result.value.value
            ) {
                const auditEvent =
                    JSON.parse(
                        result.value.value.toString(
                            'utf8'
                        )
                    );

                history.push(
                    auditEvent
                );
            }

            if (result.done) {
                await iterator.close();
                break;
            }
        }

        history.sort(
            (a, b) =>
                Number(a.eventNumber) -
                Number(b.eventNumber)
        );

        return JSON.stringify(history);
    }
}

module.exports = RemitXSettlement;