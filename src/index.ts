#!/usr/bin/env node

import {Command} from 'commander';
import chalk from 'chalk';
import {getCertificateData} from './cert-manager';
import {upsertCertificate} from './azion';

const program = new Command();

program
    .version(require('../package.json').version)
    .option('--cm-name <cm-name>', 'cert-manager certificate name')
    .option('--cm-namespace <cm-namespace>', 'cert-manager certificate namespace')
    .option('--kube-context <kube-context>', 'Kube config context')
    .option('--azion-name <azion-name>', 'Azion certificate name')
    .option('--azion-username <azion-username>', 'Azion API username')
    .option('--azion-password <azion-password>', 'Azion API password')
    .parse();

const options = Object.assign(
    {
        azionUsername: process.env['CM_TO_AZION_AZION_USERNAME'],
        azionPassword: process.env['CM_TO_AZION_AZION_PASSWORD']
    },
    program.opts()
);

function exit(msg?: any, code = 0) {
    if (msg) {
        if (code > 0) {
            console.error(chalk.red(msg));
        } else {
            console.log(chalk.green(msg));
        }
    }
    process.exit(code);
}

if (!options.cmName) exit('Invalid cert-manager certificate name', 1);
if (!options.azionName) exit('Invalid Azion certificate name', 1);
if (!options.azionUsername) exit('Invalid Azion username', 1);
if (!options.azionPassword) exit('Invalid Azion password', 1);

getCertificateData(options.cmName, options.cmNamespace, options.kubeContext)
    .then(certificateData => {
        return upsertCertificate(
            options.azionName,
            certificateData,
            {
                username: options.azionUsername,
                password: options.azionPassword
            }
        );
    })
    .then(id => {
        exit(`Certificate copied to Azion with the ID "${id}"`, 0);
    })
    .catch(e => {
        exit(e.message, 1);
    });