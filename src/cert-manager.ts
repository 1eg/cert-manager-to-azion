import {CoreV1Api, CustomObjectsApi, KubeConfig} from "@kubernetes/client-node";

const kubeConfigs: { [context: string]: KubeConfig } = {};

function getKubeConfig(context: string): KubeConfig {
    if (context in kubeConfigs) {
        return kubeConfigs[context];
    }
    const kubeConfig = new KubeConfig();
    kubeConfig.loadFromDefault();
    if (context) {
        kubeConfig.setCurrentContext(context);
    }
    if (!kubeConfig.getContextObject(kubeConfig.getCurrentContext())) {
        throw new Error('Invalid kube context');
    }
    kubeConfigs[context] = kubeConfig;
    return kubeConfig;
}

function getKubeNamespace(kubeConfig: KubeConfig): string {
    return kubeConfig.getContextObject(kubeConfig.getCurrentContext()).namespace || 'default';
}

function decodeSecretValue(value): string {
    return Buffer.from(value, 'base64').toString('ascii');
}

async function getCertificateCrd(kubeConfig: KubeConfig, name: string, namespace: string): Promise<any> {
    const customObjectsApi = kubeConfig.makeApiClient(CustomObjectsApi);

    try {
        return (await customObjectsApi.getNamespacedCustomObject(
            'cert-manager.io',
            'v1',
            namespace,
            'certificates',
            name
        )).body;
    } catch (e) {
        if (e.response?.statusCode === 404) {
            return null;
        }
        throw e;
    }
}

async function getCertificateSecret(kubeConfig: KubeConfig, name: string, namespace: string): Promise<any> {
    const coreV1Api = kubeConfig.makeApiClient(CoreV1Api);

    try {
        return (await coreV1Api.readNamespacedSecret(name, namespace)).body;
    } catch (e) {
        if (e.response?.statusCode === 404) {
            return null;
        }
        throw e;
    }
}

export async function getCertificateData(name: string, namespace?: string, context?: string): Promise<CertificateData> {
    const kubeConfig = getKubeConfig(context);
    if (!namespace) {
        namespace = getKubeNamespace(kubeConfig);
    }

    const certificateCrd = await getCertificateCrd(kubeConfig, name, namespace);
    if (!certificateCrd) {
        throw new Error('cert-manager certificate not found');
    }

    const secretName = certificateCrd.spec?.secretName;
    const certificateSecret = await getCertificateSecret(kubeConfig, secretName, namespace);
    if (!certificateSecret) {
        throw new Error('cert-manager certificate secret not found');
    }

    return {
        crt: decodeSecretValue(certificateSecret.data['tls.crt']),
        key: decodeSecretValue(certificateSecret.data['tls.key'])
    }
}

interface CertificateData {
    crt: string,
    key: string
}