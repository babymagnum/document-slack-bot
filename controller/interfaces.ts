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