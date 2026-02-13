import puter from "@heyputer/puter.js"
import { getOrCreateHostingConfig, uploadImageToHosting } from "./puter.hosting";
import { isHostedUrl } from "./utils";
import { PUTER_WORKER_URL } from "./constants";

export const signIn = async () => await puter.auth.signIn()

export const signOut = () => puter.auth.signOut()

export const getCurrentUser = async () => {
    try {
        return await puter.auth.getUser();
    } catch {
        return null;
    }
}

export const createProject = async ({ item, visibility }: CreateProjectParams): Promise<DesignItem | null | undefined> => {
    const projectId = item.id;

    const hosting = await getOrCreateHostingConfig();


    const hostedSource = projectId ? await uploadImageToHosting({
        hosting, url: item.sourceImage, projectId, label: 'source'
    }) : null;

    const hostedRender = projectId && item.renderedImage ? await uploadImageToHosting({ hosting, url: item.renderedImage, projectId, label: "rendered", }) : null;

    const resolvedSource = hostedSource?.url || item.sourceImage;

    if (!resolvedSource) {
        console.warn('No source image available, skipping save.');
        return null;
    }

    const resolvedRender = hostedRender?.url ? hostedRender?.url : item.renderedImage && isHostedUrl(item.renderedImage) ? item.renderedImage : undefined;


    const {
        sourcePath: _sourcePath,
        renderedPath: _renderedPath,
        publicPath: _publicPath,
        ...rest

    } = item;

    const payload = {
        ...rest,
        sourceImage: resolvedSource,
        renderedImage: resolvedRender,
        isPublic: visibility === "public",
    };

    if (!PUTER_WORKER_URL) {
        console.error("PUTER_WORKER_URL is missing. Please set VITE_PUTER_WORKER_URL in your environment.");
        return null;
    }

    try {
        const response = await fetch(PUTER_WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error(`Worker returned non-JSON response (${response.status}): ${text.substring(0, 100)}...`);
            throw new Error("Invalid response from server");
        }

        if (!response.ok) {
            throw new Error(`Worker returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data as DesignItem;
    } catch (e) {
        console.error(`Failed to save project:`, e);
        return null;
    }

}

export const getProject = async (id: string): Promise<DesignItem | null> => {
    try {
        const response = await fetch(`${PUTER_WORKER_URL}?id=${id}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data as DesignItem;
    } catch (e) {
        console.warn('Failed to fetch project:', e);
        return null;
    }
}