async function testRender() {
    try {
        const response = await fetch('http://localhost:3000/api/render', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                templateSlug: 'quicklogoreveal',
                parameters: {
                    logoImage: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png'
                }
            })
        });
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testRender();
