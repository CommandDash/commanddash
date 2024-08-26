// src/lib/utils/validateURL.ts

export const validateURL = (url: string, platform: string): { isValid: boolean, packageName: string } => {
    const patterns = {
        github: /^(https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?)$/,
        npm: /^(https:\/\/www\.npmjs\.com\/package\/(@?[A-Za-z0-9_.-]+\/?[A-Za-z0-9_.-]+))\/?.*$/,
        pypi: /^(https:\/\/pypi\.org\/project\/([A-Za-z0-9_.-]+))\/?.*$/,
        pub: /^(https:\/\/pub\.dev\/packages\/([A-Za-z0-9_.-]+))\/?.*$/,
    };

    const match = url.match(patterns[platform]);
    if (match) {
        return { isValid: true, packageName: match[2] };
    } else {
        return { isValid: false, packageName: "" };
    }
};