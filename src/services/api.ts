// API service
const API_URL = import.meta.env.VITE_API_URL;

export async function uploadPDF(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok)
        throw new Error(await response.text());

    return response.json();
}

export async function askQuestion(question: string) {
    const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
            "Content-Type":"application/json"
        },
        body: JSON.stringify({
            question
        })
    });

    if(!response.ok)
        throw new Error(await response.text());

    return response.json();
}

export async function health() {
    const response = await fetch(`${API_URL}/`);
    return response.json();
}