export interface FileInfo {
    ok: boolean
    url_download?: string
}

export interface DocumentInfo {
    generatedPdfPath: string
    originPdfPath: string
}

export interface ConversationResult {
    document?: string
    keyword?: string
    answer: string
}

export interface LastResponse {
    document?: string
    keyword?: string
    answer: string
    lastQuestion: string
}