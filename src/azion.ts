import axios from "axios";

const azionApiEndpoint = 'https://api.azionapi.net';

async function getToken(credentials: Credentials): Promise<string> {
    const basicAuth = Buffer.from(credentials.username + ':' + credentials.password).toString('base64');

    try {
        const response = await axios.post(
            azionApiEndpoint + '/tokens',
            {},
            {
                headers: {
                    Accept: 'application/json; version=3',
                    Authorization: `Basic ${basicAuth}`
                }
            }
        );
        return response.data.token;
    } catch (e) {
        const status = e.response.status;
        if ([400, 401, 403].includes(status)) {
            return null;
        }
        throw e;
    }
}

async function getCertificateByName(name: string, token: string): Promise<DigitalCertificate> {
    try {
        const response = await axios.request({
            baseURL: azionApiEndpoint,
            url: `/digital_certificates?name=${name}`,
            method: 'GET',
            data: {},
            headers: {
                Accept: 'application/json; version=3',
                Authorization: `token ${token}`
            }
        });

        if (response.data.results.length === 0) {
            return null;
        }

        const certificate = response.data.results.pop();
        if (certificate.name !== name) {
            return null;
        }

        return certificate;
    } catch (e) {
        throw e;
    }
}

async function createCertificate(name: string, certificateData: CertificateData, token: string): Promise<number> {
    try {
        const response = await axios.request({
            baseURL: azionApiEndpoint,
            url: `/digital_certificates`,
            method: 'POST',
            data: {
                name,
                certificate: certificateData.crt,
                private_key: certificateData.key
            },
            headers: {
                Accept: 'application/json; version=3',
                Authorization: `token ${token}`
            }
        });

        return response.data.results.id;
    } catch (e) {
        throw e;
    }
}

async function updateCertificate(id: number, certificateData: CertificateData, token: string): Promise<any> {
    try {
        await axios.request({
            baseURL: azionApiEndpoint,
            url: `/digital_certificates/${id}`,
            method: 'PATCH',
            data: {
                certificate: certificateData.crt,
                private_key: certificateData.key
            },
            headers: {
                Accept: 'application/json; version=3',
                Authorization: `token ${token}`
            }
        });
    } catch (e) {
        throw e;
    }
}

export async function upsertCertificate(name: string, certificateData: CertificateData, credentials: Credentials): Promise<number> {
    let token;
    try {
        token = await getToken(credentials);
    } catch (e) {
        const reason = e.response?.data?.detail || e.message;
        throw new Error(`Cannot authenticate tp Azion. Reason: ${reason}`);
    }
    if (!token) {
        throw new Error('Invalid Azion credentials');
    }

    const certificate = await getCertificateByName(name, token);

    if (!certificate) {
        try {
            return await createCertificate(name, certificateData, token);
        } catch (e) {
            const reason = e.response?.data?.detail || e.message;
            throw new Error(`Cannot create certificate in Azion. Reason: ${reason}`)
        }
    }

    try {
        await updateCertificate(certificate.id, certificateData, token);
        return certificate.id;
    } catch (e) {
        const reason = e.response?.data?.detail || e.message;
        throw new Error(`Cannot update certificate "${certificate.id}" in Azion. Reason: ${reason}`);
    }
}

interface CertificateData {
    crt: string,
    key: string
}

interface DigitalCertificate {
    id: number,
    name: string
    subject_name: string[],
    validity: string
}

interface Credentials {
    username: string,
    password: string
}