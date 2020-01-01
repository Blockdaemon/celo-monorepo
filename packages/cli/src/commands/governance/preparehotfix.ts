import { flags } from '@oclif/command'
import { toBuffer } from 'ethereumjs-util'
import { BaseCommand } from '../../base'
import { newCheckBuilder } from '../../utils/checks'
import { displaySendTx } from '../../utils/cli'
import { Flags } from '../../utils/command'

export default class PrepareHotfix extends BaseCommand {
  static description = 'Prepare a governance hotfix for execution in the current epoch'

  static flags = {
    ...BaseCommand.flags,
    from: Flags.address({ required: true, description: "Preparer's address" }),
    hash: flags.string({ required: true, description: 'Hash of hotfix transactions' }),
  }

  static examples = []

  async run() {
    const res = this.parse(PrepareHotfix)
    const account = res.flags.from
    this.kit.defaultAccount = account

    const governance = await this.kit.contracts.getGovernance()
    const hash = toBuffer(res.flags.hash) as Buffer

    await newCheckBuilder(this, account)
      .hotfixIsPassing(hash)
      .addCheck(`Hotfix ${hash} not already prepared for current epoch`, async () => {
        const { preparedEpoch } = await governance.getHotfixRecord(hash)
        const validators = await this.kit.contracts.getValidators()
        const currentEpoch = await validators.getEpochNumber()
        return preparedEpoch.lt(currentEpoch)
      })
      .runChecks()

    await displaySendTx('prepareHotfixTx', governance.prepareHotfix(hash))
  }
}
