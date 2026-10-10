import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_1 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_2 = __compactRuntime.CompactTypeBoolean;

const _descriptor_3 = __compactRuntime.CompactTypeJubjubPoint;

const _descriptor_4 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_5 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

const _descriptor_6 = __compactRuntime.CompactTypeField;

class _OracleSignature_0 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_6.alignment());
  }
  fromValue(value_0) {
    return {
      announcement: _descriptor_3.fromValue(value_0),
      response: _descriptor_6.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.announcement).concat(_descriptor_6.toValue(value_0.response));
  }
}

const _descriptor_7 = new _OracleSignature_0();

const _descriptor_8 = new __compactRuntime.CompactTypeBytes(3);

class _Attestation_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_4.alignment().concat(_descriptor_1.alignment().concat(_descriptor_8.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))))))))))));
  }
  fromValue(value_0) {
    return {
      schemaVersion: _descriptor_4.fromValue(value_0),
      domain: _descriptor_0.fromValue(value_0),
      policyId: _descriptor_0.fromValue(value_0),
      subject: _descriptor_0.fromValue(value_0),
      eligible: _descriptor_2.fromValue(value_0),
      assuranceLevel: _descriptor_4.fromValue(value_0),
      amountMinorUnits: _descriptor_1.fromValue(value_0),
      currency: _descriptor_8.fromValue(value_0),
      issuedAt: _descriptor_1.fromValue(value_0),
      expiresAt: _descriptor_1.fromValue(value_0),
      statusValidUntil: _descriptor_1.fromValue(value_0),
      nonce: _descriptor_0.fromValue(value_0),
      documentHash: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.schemaVersion).concat(_descriptor_0.toValue(value_0.domain).concat(_descriptor_0.toValue(value_0.policyId).concat(_descriptor_0.toValue(value_0.subject).concat(_descriptor_2.toValue(value_0.eligible).concat(_descriptor_4.toValue(value_0.assuranceLevel).concat(_descriptor_1.toValue(value_0.amountMinorUnits).concat(_descriptor_8.toValue(value_0.currency).concat(_descriptor_1.toValue(value_0.issuedAt).concat(_descriptor_1.toValue(value_0.expiresAt).concat(_descriptor_1.toValue(value_0.statusValidUntil).concat(_descriptor_0.toValue(value_0.nonce).concat(_descriptor_0.toValue(value_0.documentHash)))))))))))));
  }
}

const _descriptor_9 = new _Attestation_0();

class _ContractAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_10 = new _ContractAddress_0();

const _descriptor_11 = new __compactRuntime.CompactTypeVector(2, _descriptor_0);

const _descriptor_12 = new __compactRuntime.CompactTypeVector(5, _descriptor_0);

const _descriptor_13 = new __compactRuntime.CompactTypeVector(3, _descriptor_0);

class _SchnorrTranscript_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment())));
  }
  fromValue(value_0) {
    return {
      tag: _descriptor_0.fromValue(value_0),
      announcement: _descriptor_3.fromValue(value_0),
      publicKey: _descriptor_3.fromValue(value_0),
      digest: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.tag).concat(_descriptor_3.toValue(value_0.announcement).concat(_descriptor_3.toValue(value_0.publicKey).concat(_descriptor_0.toValue(value_0.digest))));
  }
}

const _descriptor_14 = new _SchnorrTranscript_0();

class _SubjectPreimage_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment()));
  }
  fromValue(value_0) {
    return {
      tag: _descriptor_0.fromValue(value_0),
      contractAddress: _descriptor_0.fromValue(value_0),
      ownerKey: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.tag).concat(_descriptor_0.toValue(value_0.contractAddress).concat(_descriptor_3.toValue(value_0.ownerKey)));
  }
}

const _descriptor_15 = new _SubjectPreimage_0();

class _Either_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_2.fromValue(value_0),
      left: _descriptor_0.fromValue(value_0),
      right: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.is_left).concat(_descriptor_0.toValue(value_0.left).concat(_descriptor_0.toValue(value_0.right)));
  }
}

const _descriptor_16 = new _Either_0();

const _descriptor_17 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.userSecretKey) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named userSecretKey');
    }
    if (typeof(witnesses_0.adminSecretKey) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named adminSecretKey');
    }
    if (typeof(witnesses_0.attestation) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named attestation');
    }
    if (typeof(witnesses_0.oracleSignature) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named oracleSignature');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      ownerScalarOf(context, ...args_1) {
        return { result: pureCircuits.ownerScalarOf(...args_1), context };
      },
      ownerKeyOf(context, ...args_1) {
        return { result: pureCircuits.ownerKeyOf(...args_1), context };
      },
      subjectFor(context, ...args_1) {
        return { result: pureCircuits.subjectFor(...args_1), context };
      },
      ownershipChallenge(context, ...args_1) {
        return { result: pureCircuits.ownershipChallenge(...args_1), context };
      },
      nullifierFor(context, ...args_1) {
        return { result: pureCircuits.nullifierFor(...args_1), context };
      },
      adminHashOf(context, ...args_1) {
        return { result: pureCircuits.adminHashOf(...args_1), context };
      },
      attestationDigest(context, ...args_1) {
        return { result: pureCircuits.attestationDigest(...args_1), context };
      },
      schnorrChallenge(context, ...args_1) {
        return { result: pureCircuits.schnorrChallenge(...args_1), context };
      },
      schnorrPublicKey(context, ...args_1) {
        return { result: pureCircuits.schnorrPublicKey(...args_1), context };
      },
      schnorrVerify(context, ...args_1) {
        return { result: pureCircuits.schnorrVerify(...args_1), context };
      },
      isUsableOracleKey(context, ...args_1) {
        return { result: pureCircuits.isUsableOracleKey(...args_1), context };
      },
      verifyAndRegister: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`verifyAndRegister: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('verifyAndRegister',
                                     'argument 1 (as invoked from Typescript)',
                                     'ciphercomply.schnorr.compact line 174 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._verifyAndRegister_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      rotateOracleKey: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`rotateOracleKey: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const newKey_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('rotateOracleKey',
                                     'argument 1 (as invoked from Typescript)',
                                     'ciphercomply.schnorr.compact line 213 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_3.toValue(newKey_0),
            alignment: _descriptor_3.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._rotateOracleKey_0(context,
                                                 partialProofData,
                                                 newKey_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      revokeSubject: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`revokeSubject: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const subject_0 = args_1[1];
        const atTime_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('revokeSubject',
                                     'argument 1 (as invoked from Typescript)',
                                     'ciphercomply.schnorr.compact line 221 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(subject_0.buffer instanceof ArrayBuffer && subject_0.BYTES_PER_ELEMENT === 1 && subject_0.length === 32)) {
          __compactRuntime.typeError('revokeSubject',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'ciphercomply.schnorr.compact line 221 char 1',
                                     'Bytes<32>',
                                     subject_0)
        }
        if (!(typeof(atTime_0) === 'bigint' && atTime_0 >= 0n && atTime_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('revokeSubject',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'ciphercomply.schnorr.compact line 221 char 1',
                                     'Uint<0..18446744073709551616>',
                                     atTime_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(subject_0).concat(_descriptor_1.toValue(atTime_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_1.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._revokeSubject_0(context,
                                               partialProofData,
                                               subject_0,
                                               atTime_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      verifyAndRegister: this.circuits.verifyAndRegister,
      rotateOracleKey: this.circuits.rotateOracleKey,
      revokeSubject: this.circuits.revokeSubject
    };
    this.provableCircuits = {
      verifyAndRegister: this.circuits.verifyAndRegister,
      rotateOracleKey: this.circuits.rotateOracleKey,
      revokeSubject: this.circuits.revokeSubject
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 6) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 6 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    const domain__0 = args_0[1];
    const policy__0 = args_0[2];
    const minAssurance__0 = args_0[3];
    const oracleKey__0 = args_0[4];
    const adminHash__0 = args_0[5];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!(domain__0.buffer instanceof ArrayBuffer && domain__0.BYTES_PER_ELEMENT === 1 && domain__0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 1 (argument 2 as invoked from Typescript)',
                                 'ciphercomply.schnorr.compact line 163 char 1',
                                 'Bytes<32>',
                                 domain__0)
    }
    if (!(policy__0.buffer instanceof ArrayBuffer && policy__0.BYTES_PER_ELEMENT === 1 && policy__0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 2 (argument 3 as invoked from Typescript)',
                                 'ciphercomply.schnorr.compact line 163 char 1',
                                 'Bytes<32>',
                                 policy__0)
    }
    if (!(typeof(minAssurance__0) === 'bigint' && minAssurance__0 >= 0n && minAssurance__0 <= 255n)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 3 (argument 4 as invoked from Typescript)',
                                 'ciphercomply.schnorr.compact line 163 char 1',
                                 'Uint<0..256>',
                                 minAssurance__0)
    }
    if (!(adminHash__0.buffer instanceof ArrayBuffer && adminHash__0.BYTES_PER_ELEMENT === 1 && adminHash__0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 5 (argument 6 as invoked from Typescript)',
                                 'ciphercomply.schnorr.compact line 163 char 1',
                                 'Bytes<32>',
                                 adminHash__0)
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('verifyAndRegister', new __compactRuntime.ContractOperation());
    state_0.setOperation('rotateOracleKey', new __compactRuntime.ContractOperation());
    state_0.setOperation('revokeSubject', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(1n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(2n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(3n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(({x: 0n, y: 1n})),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(4n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(5n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(6n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(7n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(8n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.assert(this._isUsableOracleKey_0(oracleKey__0),
                            'Unusable oracle key');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(domain__0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(1n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(policy__0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(2n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(minAssurance__0),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(3n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(oracleKey__0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(4n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(tmp_0),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(5n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(adminHash__0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _blockTimeLt_0(context, partialProofData, time_0) {
    return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 2 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_4.toValue(2n),
                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(time_0),
                                                                                                                             alignment: _descriptor_1.alignment() }).encode() } },
                                                                      'lt',
                                                                      { popeq: { cached: true,
                                                                                 result: undefined } }]).value);
  }
  _blockTimeGte_0(context, partialProofData, time_0) {
    return !this._blockTimeLt_0(context, partialProofData, time_0);
  }
  _transientHash_0(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_14, value_0);
    return result_0;
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_15, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_12, value_0);
    return result_0;
  }
  _persistentHash_2(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_13, value_0);
    return result_0;
  }
  _persistentHash_3(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_11, value_0);
    return result_0;
  }
  _persistentHash_4(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_9, value_0);
    return result_0;
  }
  _jubjubPointX_0(np_0) {
    const result_0 = __compactRuntime.jubjubPointX(np_0);
    return result_0;
  }
  _ecAdd_0(a_0, b_0) {
    const result_0 = __compactRuntime.ecAdd(a_0, b_0);
    return result_0;
  }
  _ecMul_0(a_0, b_0) {
    const result_0 = __compactRuntime.ecMul(a_0, b_0);
    return result_0;
  }
  _ecMulGenerator_0(b_0) {
    const result_0 = __compactRuntime.ecMulGenerator(b_0);
    return result_0;
  }
  _userSecretKey_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.userSecretKey(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('userSecretKey',
                                 'return value',
                                 'ciphercomply.schnorr.compact line 53 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _adminSecretKey_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.adminSecretKey(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('adminSecretKey',
                                 'return value',
                                 'ciphercomply.schnorr.compact line 54 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _attestation_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.attestation(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && typeof(result_0.schemaVersion) === 'bigint' && result_0.schemaVersion >= 0n && result_0.schemaVersion <= 255n && result_0.domain.buffer instanceof ArrayBuffer && result_0.domain.BYTES_PER_ELEMENT === 1 && result_0.domain.length === 32 && result_0.policyId.buffer instanceof ArrayBuffer && result_0.policyId.BYTES_PER_ELEMENT === 1 && result_0.policyId.length === 32 && result_0.subject.buffer instanceof ArrayBuffer && result_0.subject.BYTES_PER_ELEMENT === 1 && result_0.subject.length === 32 && typeof(result_0.eligible) === 'boolean' && typeof(result_0.assuranceLevel) === 'bigint' && result_0.assuranceLevel >= 0n && result_0.assuranceLevel <= 255n && typeof(result_0.amountMinorUnits) === 'bigint' && result_0.amountMinorUnits >= 0n && result_0.amountMinorUnits <= 18446744073709551615n && result_0.currency.buffer instanceof ArrayBuffer && result_0.currency.BYTES_PER_ELEMENT === 1 && result_0.currency.length === 3 && typeof(result_0.issuedAt) === 'bigint' && result_0.issuedAt >= 0n && result_0.issuedAt <= 18446744073709551615n && typeof(result_0.expiresAt) === 'bigint' && result_0.expiresAt >= 0n && result_0.expiresAt <= 18446744073709551615n && typeof(result_0.statusValidUntil) === 'bigint' && result_0.statusValidUntil >= 0n && result_0.statusValidUntil <= 18446744073709551615n && result_0.nonce.buffer instanceof ArrayBuffer && result_0.nonce.BYTES_PER_ELEMENT === 1 && result_0.nonce.length === 32 && result_0.documentHash.buffer instanceof ArrayBuffer && result_0.documentHash.BYTES_PER_ELEMENT === 1 && result_0.documentHash.length === 32)) {
      __compactRuntime.typeError('attestation',
                                 'return value',
                                 'ciphercomply.schnorr.compact line 55 char 1',
                                 'struct Attestation<schemaVersion: Uint<0..256>, domain: Bytes<32>, policyId: Bytes<32>, subject: Bytes<32>, eligible: Boolean, assuranceLevel: Uint<0..256>, amountMinorUnits: Uint<0..18446744073709551616>, currency: Bytes<3>, issuedAt: Uint<0..18446744073709551616>, expiresAt: Uint<0..18446744073709551616>, statusValidUntil: Uint<0..18446744073709551616>, nonce: Bytes<32>, documentHash: Bytes<32>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_9.toValue(result_0),
      alignment: _descriptor_9.alignment()
    });
    return result_0;
  }
  _oracleSignature_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.oracleSignature(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && true && typeof(result_0.response) === 'bigint' && result_0.response >= 0 && result_0.response <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('oracleSignature',
                                 'return value',
                                 'ciphercomply.schnorr.compact line 56 char 1',
                                 'struct OracleSignature<announcement: Opaque<"JubjubPoint">, response: Field>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_7.toValue(result_0),
      alignment: _descriptor_7.alignment()
    });
    return result_0;
  }
  _ownerScalarOf_0(secretKey_0) {
    return __compactRuntime.convertBytesToField(31,
                                                ((e, i) => e.slice(i, i+31))(secretKey_0,
                                                                             Number(0n)),
                                                'ciphercomply.schnorr.compact line 77 char 11');
  }
  _ownerKeyOf_0(secretKey_0) {
    return this._ecMulGenerator_0(this._ownerScalarOf_0(secretKey_0));
  }
  _subjectFor_0(contractAddress_0, ownerKey_0) {
    return this._persistentHash_0({ tag:
                                      new Uint8Array([99, 99, 58, 115, 117, 98, 106, 101, 99, 116, 58, 118, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    contractAddress: contractAddress_0,
                                    ownerKey: ownerKey_0 });
  }
  _ownershipChallenge_0(domain_0, policy_0, serverNonce_0, subject_0) {
    return this._persistentHash_1([new Uint8Array([99, 99, 58, 111, 119, 110, 101, 114, 115, 104, 105, 112, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   domain_0,
                                   policy_0,
                                   serverNonce_0,
                                   subject_0]);
  }
  _nullifierFor_0(contractAddress_0, nonce_0) {
    return this._persistentHash_2([new Uint8Array([99, 99, 58, 110, 117, 108, 108, 105, 102, 105, 101, 114, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   contractAddress_0,
                                   nonce_0]);
  }
  _adminHashOf_0(sk_0) {
    return this._persistentHash_3([new Uint8Array([99, 99, 58, 97, 100, 109, 105, 110, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   sk_0]);
  }
  _subjectOf_0(context, partialProofData, secretKey_0) {
    return this._subjectFor_0(_descriptor_10.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                         partialProofData,
                                                                                         [
                                                                                          { dup: { n: 2 } },
                                                                                          { idx: { cached: true,
                                                                                                   pushPath: false,
                                                                                                   path: [
                                                                                                          { tag: 'value',
                                                                                                            value: { value: _descriptor_4.toValue(0n),
                                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                                          { popeq: { cached: true,
                                                                                                     result: undefined } }]).value).bytes,
                              this._ownerKeyOf_0(secretKey_0));
  }
  _nullifierOf_0(context, partialProofData, nonce_0) {
    return this._nullifierFor_0(_descriptor_10.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                           partialProofData,
                                                                                           [
                                                                                            { dup: { n: 2 } },
                                                                                            { idx: { cached: true,
                                                                                                     pushPath: false,
                                                                                                     path: [
                                                                                                            { tag: 'value',
                                                                                                              value: { value: _descriptor_4.toValue(0n),
                                                                                                                       alignment: _descriptor_4.alignment() } }] } },
                                                                                            { popeq: { cached: true,
                                                                                                       result: undefined } }]).value).bytes,
                                nonce_0);
  }
  _adminCheck_0(context, partialProofData, sk_0) {
    return this._equal_0(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                   partialProofData,
                                                                                   [
                                                                                    { dup: { n: 0 } },
                                                                                    { idx: { cached: false,
                                                                                             pushPath: false,
                                                                                             path: [
                                                                                                    { tag: 'value',
                                                                                                      value: { value: _descriptor_4.toValue(5n),
                                                                                                               alignment: _descriptor_4.alignment() } }] } },
                                                                                    { popeq: { cached: false,
                                                                                               result: undefined } }]).value),
                         this._adminHashOf_0(sk_0));
  }
  _attestationDigest_0(a_0) { return this._persistentHash_4(a_0); }
  _schnorrChallenge_0(announcement_0, publicKey_0, digest_0) {
    const h_0 = this._transientHash_0({ tag:
                                          new Uint8Array([99, 99, 58, 115, 99, 104, 110, 111, 114, 114, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                        announcement: announcement_0,
                                        publicKey: publicKey_0,
                                        digest: digest_0 });
    return __compactRuntime.convertBytesToField(31,
                                                ((e, i) => e.slice(i, i+31))(__compactRuntime.convertFieldToBytes(32,
                                                                                                                  h_0,
                                                                                                                  'ciphercomply.schnorr.compact line 143 char 21'),
                                                                             Number(0n)),
                                                'ciphercomply.schnorr.compact line 143 char 11');
  }
  _schnorrPublicKey_0(secretScalar_0) {
    return this._ecMulGenerator_0(secretScalar_0);
  }
  _schnorrVerify_0(publicKey_0, digest_0, sig_0) {
    const c_0 = this._schnorrChallenge_0(sig_0.announcement,
                                         publicKey_0,
                                         digest_0);
    return this._equal_1(this._ecMulGenerator_0(sig_0.response),
                         this._ecAdd_0(sig_0.announcement,
                                       this._ecMul_0(publicKey_0, c_0)));
  }
  _isUsableOracleKey_0(publicKey_0) {
    return this._jubjubPointX_0(this._ecMul_0(publicKey_0, 8n)) !== 0n;
  }
  _verifyAndRegister_0(context, partialProofData) {
    const a_0 = this._attestation_0(context, partialProofData);
    const digest_0 = this._attestationDigest_0(a_0);
    const subject_0 = a_0.subject;
    __compactRuntime.assert(this._equal_2(a_0.schemaVersion, 1n),
                            'Unsupported schema');
    __compactRuntime.assert(this._equal_3(a_0.domain,
                                          _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_4.toValue(0n),
                                                                                                                                alignment: _descriptor_4.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'Wrong domain');
    __compactRuntime.assert(this._equal_4(a_0.policyId,
                                          _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_4.toValue(1n),
                                                                                                                                alignment: _descriptor_4.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'Wrong policy');
    __compactRuntime.assert(this._equal_5(subject_0,
                                          this._subjectOf_0(context,
                                                            partialProofData,
                                                            this._userSecretKey_0(context,
                                                                                  partialProofData))),
                            'Subject mismatch');
    let t_0;
    __compactRuntime.assert((t_0 = a_0.assuranceLevel,
                             t_0
                             >=
                             _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value)),
                            'Assurance below policy minimum');
    let t_1;
    __compactRuntime.assert((t_1 = a_0.issuedAt, t_1 < a_0.expiresAt),
                            'Invalid window');
    let t_2;
    __compactRuntime.assert((t_2 = a_0.expiresAt, t_2 <= a_0.statusValidUntil),
                            'Invalid status window');
    __compactRuntime.assert(this._blockTimeLt_0(context,
                                                partialProofData,
                                                a_0.expiresAt),
                            'Attestation expired');
    __compactRuntime.assert(this._schnorrVerify_0(_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                            partialProofData,
                                                                                                            [
                                                                                                             { dup: { n: 0 } },
                                                                                                             { idx: { cached: false,
                                                                                                                      pushPath: false,
                                                                                                                      path: [
                                                                                                                             { tag: 'value',
                                                                                                                               value: { value: _descriptor_4.toValue(3n),
                                                                                                                                        alignment: _descriptor_4.alignment() } }] } },
                                                                                                             { popeq: { cached: false,
                                                                                                                        result: undefined } }]).value),
                                                  digest_0,
                                                  this._oracleSignature_0(context,
                                                                          partialProofData)),
                            'Invalid oracle signature');
    if (_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                  partialProofData,
                                                                  [
                                                                   { dup: { n: 0 } },
                                                                   { idx: { cached: false,
                                                                            pushPath: false,
                                                                            path: [
                                                                                   { tag: 'value',
                                                                                     value: { value: _descriptor_4.toValue(7n),
                                                                                              alignment: _descriptor_4.alignment() } }] } },
                                                                   { push: { storage: false,
                                                                             value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(subject_0),
                                                                                                                          alignment: _descriptor_0.alignment() }).encode() } },
                                                                   'member',
                                                                   { popeq: { cached: true,
                                                                              result: undefined } }]).value))
    {
      let t_3;
      __compactRuntime.assert((t_3 = a_0.issuedAt,
                               t_3
                               >=
                               _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                         partialProofData,
                                                                                         [
                                                                                          { dup: { n: 0 } },
                                                                                          { idx: { cached: false,
                                                                                                   pushPath: false,
                                                                                                   path: [
                                                                                                          { tag: 'value',
                                                                                                            value: { value: _descriptor_4.toValue(7n),
                                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                                          { idx: { cached: false,
                                                                                                   pushPath: false,
                                                                                                   path: [
                                                                                                          { tag: 'value',
                                                                                                            value: { value: _descriptor_0.toValue(subject_0),
                                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                                          { popeq: { cached: false,
                                                                                                     result: undefined } }]).value)),
                              'Issued before revocation');
    }
    const nf_0 = this._nullifierOf_0(context, partialProofData, a_0.nonce);
    __compactRuntime.assert(!_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(8n),
                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(nf_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Attestation already used');
    __compactRuntime.assert(a_0.eligible, 'Not eligible');
    const statusValidUntil_0 = a_0.statusValidUntil;
    if (_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                  partialProofData,
                                                                  [
                                                                   { dup: { n: 0 } },
                                                                   { idx: { cached: false,
                                                                            pushPath: false,
                                                                            path: [
                                                                                   { tag: 'value',
                                                                                     value: { value: _descriptor_4.toValue(6n),
                                                                                              alignment: _descriptor_4.alignment() } }] } },
                                                                   { push: { storage: false,
                                                                             value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(subject_0),
                                                                                                                          alignment: _descriptor_0.alignment() }).encode() } },
                                                                   'member',
                                                                   { popeq: { cached: true,
                                                                              result: undefined } }]).value))
    {
      __compactRuntime.assert(statusValidUntil_0
                              >=
                              _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                        partialProofData,
                                                                                        [
                                                                                         { dup: { n: 0 } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_4.toValue(6n),
                                                                                                                    alignment: _descriptor_4.alignment() } }] } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_0.toValue(subject_0),
                                                                                                                    alignment: _descriptor_0.alignment() } }] } },
                                                                                         { popeq: { cached: false,
                                                                                                    result: undefined } }]).value),
                              'Status would move backward');
    }
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(8n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(nf_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(true),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(6n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(subject_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(statusValidUntil_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _rotateOracleKey_0(context, partialProofData, newKey_0) {
    __compactRuntime.assert(this._adminCheck_0(context,
                                               partialProofData,
                                               this._adminSecretKey_0(context,
                                                                      partialProofData)),
                            'Not admin');
    __compactRuntime.assert(this._isUsableOracleKey_0(newKey_0),
                            'Unusable oracle key');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(3n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(newKey_0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_0 = ((t1) => {
                    if (t1 > 4294967295n) {
                      throw new __compactRuntime.CompactError('ciphercomply.schnorr.compact line 217 char 18: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                    }
                    return t1;
                  })(_descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(4n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     1n);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(4n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(tmp_0),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _revokeSubject_0(context, partialProofData, subject_0, atTime_0) {
    __compactRuntime.assert(this._adminCheck_0(context,
                                               partialProofData,
                                               this._adminSecretKey_0(context,
                                                                      partialProofData)),
                            'Not admin');
    __compactRuntime.assert(this._blockTimeGte_0(context,
                                                 partialProofData,
                                                 atTime_0),
                            'Revocation in the future');
    if (_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                  partialProofData,
                                                                  [
                                                                   { dup: { n: 0 } },
                                                                   { idx: { cached: false,
                                                                            pushPath: false,
                                                                            path: [
                                                                                   { tag: 'value',
                                                                                     value: { value: _descriptor_4.toValue(7n),
                                                                                              alignment: _descriptor_4.alignment() } }] } },
                                                                   { push: { storage: false,
                                                                             value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(subject_0),
                                                                                                                          alignment: _descriptor_0.alignment() }).encode() } },
                                                                   'member',
                                                                   { popeq: { cached: true,
                                                                              result: undefined } }]).value))
    {
      let t_0;
      __compactRuntime.assert((t_0 = atTime_0,
                               t_0
                               >=
                               _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                         partialProofData,
                                                                                         [
                                                                                          { dup: { n: 0 } },
                                                                                          { idx: { cached: false,
                                                                                                   pushPath: false,
                                                                                                   path: [
                                                                                                          { tag: 'value',
                                                                                                            value: { value: _descriptor_4.toValue(7n),
                                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                                          { idx: { cached: false,
                                                                                                   pushPath: false,
                                                                                                   path: [
                                                                                                          { tag: 'value',
                                                                                                            value: { value: _descriptor_0.toValue(subject_0),
                                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                                          { popeq: { cached: false,
                                                                                                     result: undefined } }]).value)),
                              'Revocation epoch moved backward');
    }
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(7n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(subject_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(atTime_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(6n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(subject_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { rem: { cached: false } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    {
      let x1 = x0.x;
      let y1 = y0.x;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.y;
      let y1 = y0.y;
      if (x1 !== y1) { return false; }
    }
    return true;
  }
  _equal_2(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_4(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_5(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get domainTag() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(0n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get policyId() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(1n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get minAssurance() {
      return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get oraclePublicKey() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(3n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get oracleKeyId() {
      return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(4n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get adminHash() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(5n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    verifiedUntil: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(6n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                                                                 alignment: _descriptor_1.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(6n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'ciphercomply.schnorr.compact line 49 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(6n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'ciphercomply.schnorr.compact line 49 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(6n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[6];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_1.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    revokedAt: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(7n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                                                                 alignment: _descriptor_1.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(7n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'ciphercomply.schnorr.compact line 50 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(7n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'ciphercomply.schnorr.compact line 50 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(7n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[7];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_1.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    usedNullifiers: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(8n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                                                                 alignment: _descriptor_1.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(8n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'ciphercomply.schnorr.compact line 51 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(8n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'ciphercomply.schnorr.compact line 51 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(8n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[8];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_2.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  userSecretKey: (...args) => undefined,
  adminSecretKey: (...args) => undefined,
  attestation: (...args) => undefined,
  oracleSignature: (...args) => undefined
});
export const pureCircuits = {
  ownerScalarOf: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`ownerScalarOf: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const secretKey_0 = args_0[0];
    if (!(secretKey_0.buffer instanceof ArrayBuffer && secretKey_0.BYTES_PER_ELEMENT === 1 && secretKey_0.length === 32)) {
      __compactRuntime.typeError('ownerScalarOf',
                                 'argument 1',
                                 'ciphercomply.schnorr.compact line 76 char 1',
                                 'Bytes<32>',
                                 secretKey_0)
    }
    return _dummyContract._ownerScalarOf_0(secretKey_0);
  },
  ownerKeyOf: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`ownerKeyOf: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const secretKey_0 = args_0[0];
    if (!(secretKey_0.buffer instanceof ArrayBuffer && secretKey_0.BYTES_PER_ELEMENT === 1 && secretKey_0.length === 32)) {
      __compactRuntime.typeError('ownerKeyOf',
                                 'argument 1',
                                 'ciphercomply.schnorr.compact line 80 char 1',
                                 'Bytes<32>',
                                 secretKey_0)
    }
    return _dummyContract._ownerKeyOf_0(secretKey_0);
  },
  subjectFor: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`subjectFor: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const contractAddress_0 = args_0[0];
    const ownerKey_0 = args_0[1];
    if (!(contractAddress_0.buffer instanceof ArrayBuffer && contractAddress_0.BYTES_PER_ELEMENT === 1 && contractAddress_0.length === 32)) {
      __compactRuntime.typeError('subjectFor',
                                 'argument 1',
                                 'ciphercomply.schnorr.compact line 84 char 1',
                                 'Bytes<32>',
                                 contractAddress_0)
    }
    return _dummyContract._subjectFor_0(contractAddress_0, ownerKey_0);
  },
  ownershipChallenge: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`ownershipChallenge: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const domain_0 = args_0[0];
    const policy_0 = args_0[1];
    const serverNonce_0 = args_0[2];
    const subject_0 = args_0[3];
    if (!(domain_0.buffer instanceof ArrayBuffer && domain_0.BYTES_PER_ELEMENT === 1 && domain_0.length === 32)) {
      __compactRuntime.typeError('ownershipChallenge',
                                 'argument 1',
                                 'ciphercomply.schnorr.compact line 94 char 1',
                                 'Bytes<32>',
                                 domain_0)
    }
    if (!(policy_0.buffer instanceof ArrayBuffer && policy_0.BYTES_PER_ELEMENT === 1 && policy_0.length === 32)) {
      __compactRuntime.typeError('ownershipChallenge',
                                 'argument 2',
                                 'ciphercomply.schnorr.compact line 94 char 1',
                                 'Bytes<32>',
                                 policy_0)
    }
    if (!(serverNonce_0.buffer instanceof ArrayBuffer && serverNonce_0.BYTES_PER_ELEMENT === 1 && serverNonce_0.length === 32)) {
      __compactRuntime.typeError('ownershipChallenge',
                                 'argument 3',
                                 'ciphercomply.schnorr.compact line 94 char 1',
                                 'Bytes<32>',
                                 serverNonce_0)
    }
    if (!(subject_0.buffer instanceof ArrayBuffer && subject_0.BYTES_PER_ELEMENT === 1 && subject_0.length === 32)) {
      __compactRuntime.typeError('ownershipChallenge',
                                 'argument 4',
                                 'ciphercomply.schnorr.compact line 94 char 1',
                                 'Bytes<32>',
                                 subject_0)
    }
    return _dummyContract._ownershipChallenge_0(domain_0,
                                                policy_0,
                                                serverNonce_0,
                                                subject_0);
  },
  nullifierFor: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`nullifierFor: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const contractAddress_0 = args_0[0];
    const nonce_0 = args_0[1];
    if (!(contractAddress_0.buffer instanceof ArrayBuffer && contractAddress_0.BYTES_PER_ELEMENT === 1 && contractAddress_0.length === 32)) {
      __compactRuntime.typeError('nullifierFor',
                                 'argument 1',
                                 'ciphercomply.schnorr.compact line 100 char 1',
                                 'Bytes<32>',
                                 contractAddress_0)
    }
    if (!(nonce_0.buffer instanceof ArrayBuffer && nonce_0.BYTES_PER_ELEMENT === 1 && nonce_0.length === 32)) {
      __compactRuntime.typeError('nullifierFor',
                                 'argument 2',
                                 'ciphercomply.schnorr.compact line 100 char 1',
                                 'Bytes<32>',
                                 nonce_0)
    }
    return _dummyContract._nullifierFor_0(contractAddress_0, nonce_0);
  },
  adminHashOf: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`adminHashOf: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const sk_0 = args_0[0];
    if (!(sk_0.buffer instanceof ArrayBuffer && sk_0.BYTES_PER_ELEMENT === 1 && sk_0.length === 32)) {
      __compactRuntime.typeError('adminHashOf',
                                 'argument 1',
                                 'ciphercomply.schnorr.compact line 105 char 1',
                                 'Bytes<32>',
                                 sk_0)
    }
    return _dummyContract._adminHashOf_0(sk_0);
  },
  attestationDigest: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`attestationDigest: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const a_0 = args_0[0];
    if (!(typeof(a_0) === 'object' && typeof(a_0.schemaVersion) === 'bigint' && a_0.schemaVersion >= 0n && a_0.schemaVersion <= 255n && a_0.domain.buffer instanceof ArrayBuffer && a_0.domain.BYTES_PER_ELEMENT === 1 && a_0.domain.length === 32 && a_0.policyId.buffer instanceof ArrayBuffer && a_0.policyId.BYTES_PER_ELEMENT === 1 && a_0.policyId.length === 32 && a_0.subject.buffer instanceof ArrayBuffer && a_0.subject.BYTES_PER_ELEMENT === 1 && a_0.subject.length === 32 && typeof(a_0.eligible) === 'boolean' && typeof(a_0.assuranceLevel) === 'bigint' && a_0.assuranceLevel >= 0n && a_0.assuranceLevel <= 255n && typeof(a_0.amountMinorUnits) === 'bigint' && a_0.amountMinorUnits >= 0n && a_0.amountMinorUnits <= 18446744073709551615n && a_0.currency.buffer instanceof ArrayBuffer && a_0.currency.BYTES_PER_ELEMENT === 1 && a_0.currency.length === 3 && typeof(a_0.issuedAt) === 'bigint' && a_0.issuedAt >= 0n && a_0.issuedAt <= 18446744073709551615n && typeof(a_0.expiresAt) === 'bigint' && a_0.expiresAt >= 0n && a_0.expiresAt <= 18446744073709551615n && typeof(a_0.statusValidUntil) === 'bigint' && a_0.statusValidUntil >= 0n && a_0.statusValidUntil <= 18446744073709551615n && a_0.nonce.buffer instanceof ArrayBuffer && a_0.nonce.BYTES_PER_ELEMENT === 1 && a_0.nonce.length === 32 && a_0.documentHash.buffer instanceof ArrayBuffer && a_0.documentHash.BYTES_PER_ELEMENT === 1 && a_0.documentHash.length === 32)) {
      __compactRuntime.typeError('attestationDigest',
                                 'argument 1',
                                 'ciphercomply.schnorr.compact line 121 char 1',
                                 'struct Attestation<schemaVersion: Uint<0..256>, domain: Bytes<32>, policyId: Bytes<32>, subject: Bytes<32>, eligible: Boolean, assuranceLevel: Uint<0..256>, amountMinorUnits: Uint<0..18446744073709551616>, currency: Bytes<3>, issuedAt: Uint<0..18446744073709551616>, expiresAt: Uint<0..18446744073709551616>, statusValidUntil: Uint<0..18446744073709551616>, nonce: Bytes<32>, documentHash: Bytes<32>>',
                                 a_0)
    }
    return _dummyContract._attestationDigest_0(a_0);
  },
  schnorrChallenge: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`schnorrChallenge: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const announcement_0 = args_0[0];
    const publicKey_0 = args_0[1];
    const digest_0 = args_0[2];
    if (!(digest_0.buffer instanceof ArrayBuffer && digest_0.BYTES_PER_ELEMENT === 1 && digest_0.length === 32)) {
      __compactRuntime.typeError('schnorrChallenge',
                                 'argument 3',
                                 'ciphercomply.schnorr.compact line 135 char 1',
                                 'Bytes<32>',
                                 digest_0)
    }
    return _dummyContract._schnorrChallenge_0(announcement_0,
                                              publicKey_0,
                                              digest_0);
  },
  schnorrPublicKey: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`schnorrPublicKey: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const secretScalar_0 = args_0[0];
    if (!(typeof(secretScalar_0) === 'bigint' && secretScalar_0 >= 0 && secretScalar_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('schnorrPublicKey',
                                 'argument 1',
                                 'ciphercomply.schnorr.compact line 146 char 1',
                                 'Field',
                                 secretScalar_0)
    }
    return _dummyContract._schnorrPublicKey_0(secretScalar_0);
  },
  schnorrVerify: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`schnorrVerify: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const publicKey_0 = args_0[0];
    const digest_0 = args_0[1];
    const sig_0 = args_0[2];
    if (!(digest_0.buffer instanceof ArrayBuffer && digest_0.BYTES_PER_ELEMENT === 1 && digest_0.length === 32)) {
      __compactRuntime.typeError('schnorrVerify',
                                 'argument 2',
                                 'ciphercomply.schnorr.compact line 150 char 1',
                                 'Bytes<32>',
                                 digest_0)
    }
    if (!(typeof(sig_0) === 'object' && true && typeof(sig_0.response) === 'bigint' && sig_0.response >= 0 && sig_0.response <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('schnorrVerify',
                                 'argument 3',
                                 'ciphercomply.schnorr.compact line 150 char 1',
                                 'struct OracleSignature<announcement: Opaque<"JubjubPoint">, response: Field>',
                                 sig_0)
    }
    return _dummyContract._schnorrVerify_0(publicKey_0, digest_0, sig_0);
  },
  isUsableOracleKey: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`isUsableOracleKey: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const publicKey_0 = args_0[0];
    return _dummyContract._isUsableOracleKey_0(publicKey_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
