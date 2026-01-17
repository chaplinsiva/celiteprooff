const PLAINLY_API_BASE = 'https://api.plainlyvideos.com/api/v2';
const PLAINLY_API_KEY = process.env.PLAINLY_API_KEY;

async function listProjects() {
    if (!PLAINLY_API_KEY) {
        console.error('PLAINLY_API_KEY not set');
        return;
    }

    const credentials = Buffer.from(`${PLAINLY_API_KEY}:`).toString('base64');

    try {
        const response = await fetch(`${PLAINLY_API_BASE}/projects`, {
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        });

        if (!response.ok) {
            console.error(`Status: ${response.status}`);
            console.error(await response.text());
            return;
        }

        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

listProjects();
