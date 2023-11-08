import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as fs from "fs";
import { loadQAMapReduceChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import axios, { AxiosHeaders } from "axios";
import { ConversationResult, DocumentInfo, FileInfo, LastResponse } from "./interfaces";
import { HumanMessage, SystemMessage, AIMessage } from "langchain/schema";
import { MultiQueryRetriever } from "langchain/retrievers/multi_query";
import { FaissStore } from "langchain/vectorstores/faiss";
import { documentSelectorTemplate } from "./prompts/app_prompts";
import { BaseLanguageModel, BaseLanguageModelCallOptions } from "langchain/dist/base_language";

require('dotenv').config()

const slackToken = `${process.env.SLACK_BOT_TOKEN}`

function model(temperature?: number, top_p?: number): ChatOpenAI {
    return new ChatOpenAI({
        temperature: temperature || 0.3,
        topP: top_p || 0.9,
        maxTokens: -1,
        verbose: true,
        azureOpenAIApiKey: process.env.OPENAI_API_KEY,
        azureOpenAIApiVersion: process.env.OPENAI_API_VERSION,
        azureOpenAIApiDeploymentName: process.env.OPENAI_API_MODEL_NAME,
        azureOpenAIBasePath: process.env.OPENAI_API_BASE_URL,
    });
}

const embeddings = new OpenAIEmbeddings({
    azureOpenAIApiKey: process.env.OPENAI_API_KEY,
    azureOpenAIApiVersion: process.env.OPENAI_API_VERSION,
    azureOpenAIApiDeploymentName: process.env.OPENAI_API_EMBEDDING_NAME,
    azureOpenAIBasePath: process.env.OPENAI_API_BASE_URL,
});

const basePdf = "./pdf-sources/pdf/";
const baseGenerated = "./pdf-sources/generated-pdf/";

const documentsInfo: DocumentInfo[] = [
    {
        originPdfPath: `${basePdf}Guideline For Assesor.pdf`,
        generatedPdfPath: `${baseGenerated}Guideline For Assesor`,
    },
    {
        originPdfPath: `${basePdf}Intern Employee Guidelines.pdf`,
        generatedPdfPath: `${baseGenerated}Intern Employee Guidelines`,
    },
    {
        originPdfPath: `${basePdf}Skyshi - Project Management Guideline.pdf`,
        generatedPdfPath: `${baseGenerated}Skyshi - Project Management Guideline`,
    },
    {
        originPdfPath: `${basePdf}Skyshi Guideline Engineer Progression.pdf`,
        generatedPdfPath: `${baseGenerated}Skyshi Guideline Engineer Progression`,
    },
    {
        originPdfPath: `${basePdf}Udemy Acces Guideline.pdf`,
        generatedPdfPath: `${baseGenerated}Udemy Acces Guideline`,
    },
    {
        originPdfPath: `${basePdf}Probation Employee Guideline.pdf`,
        generatedPdfPath: `${baseGenerated}Probation Employee Guideline`,
    }
]

export async function getFileInfo(fileId: string): Promise<FileInfo> {
    axios.AxiosHeaders
    const res = await axios.get(`https://slack.com/api/files.info?file=${fileId}`, {
        headers: new AxiosHeaders({
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${slackToken}`
        })
    })

    if (res.status !== 200) return { ok: false }

    return {
        ok: true,
        url_download: res.data.file.url_private
    } as FileInfo
}

async function checkDocumentContainsQuestion(question: string, lastResponse?: LastResponse): Promise<ConversationResult> {
    try {
        const lastResponseArray: (HumanMessage | AIMessage)[] = []

        if (lastResponse !== undefined) {
            lastResponseArray.push(new HumanMessage(lastResponse.lastQuestion))
            lastResponseArray.push(new AIMessage(`"<${lastResponse.document || ''}>";"<${lastResponse.keyword || ''}>";"<${lastResponse.answer}>"`))
        }

        const result = await model(0.3, 0.7).call([
            new SystemMessage(documentSelectorTemplate),
            new HumanMessage('selamat pagi'),
            new AIMessage(`"<>";"<>";"<Selamat pagi! Ada yang bisa saya bantu? Jika Anda memiliki pertanyaan tentang kebijakan perusahaan atau pedoman karyawan, jangan ragu untuk bertanya!>"`),
            ...lastResponseArray,
            new HumanMessage(question)
        ]);

        if (!result.content.includes(';')) {
            return { answer: result.content }
        }

        const document = result.content.split(';')[0].replace(/[""<>]/g, "")
        const keyword = result.content.split(';')[1].replace(/[""<>]/g, "")
        const answer = result.content.split(';')[2].replace(/[""<>]/g, "")

        return {
            document: document,
            keyword: keyword,
            answer: answer
        }
    } catch (error) {
        return {
            answer: `${error}`
        }
    }
}

export async function fetchDocumentData(question: string, lastResponse?: LastResponse): Promise<ConversationResult | null> {
    // check if all pdf is saved locally
    for (const value of documentsInfo) {
        if (!fs.existsSync(value.generatedPdfPath)) {
            console.log(`directory ${value} not exist`);

            const fileName = value.generatedPdfPath.split('/').pop() || '';

            if (fileName === "") { continue; }

            const loader = new PDFLoader(`${basePdf}${fileName}.pdf`, { splitPages: false });

            // load and split the file to chunk/documents
            const docs = await loader.loadAndSplit(new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 1000 / 5,
            }));

            const vectorStore = await FaissStore.fromDocuments(docs, embeddings);

            await vectorStore.save(value.generatedPdfPath);
        } else {
            console.log(`directory ${value} is exist`);
        }
    }

    let selectedDocumentInfo: ConversationResult = await checkDocumentContainsQuestion(question, lastResponse)

    if (selectedDocumentInfo.document === null) return { answer: selectedDocumentInfo.answer }

    const isDocumentSuggestedFromOpenAINotFound = documentsInfo.filter((element) => element.generatedPdfPath === `${baseGenerated}${selectedDocumentInfo.document}`).length === 0

    if (selectedDocumentInfo.document === '' || isDocumentSuggestedFromOpenAINotFound) return { answer: selectedDocumentInfo.answer }

    console.log(`selectedDocumentInfo ==> ${selectedDocumentInfo.document}`)

    const vectorStore = await FaissStore.load(`${baseGenerated}${selectedDocumentInfo.document!}`, embeddings)

    const relevantDocuments = await vectorStore.similaritySearch(selectedDocumentInfo.keyword || question)

    const chain = loadQAMapReduceChain(model(0.2, 0.85))

    try {
        const res = await chain.call({
            input_documents: relevantDocuments,
            question: `
            Tolong tampilkan data yang berhubungan dengan keyword berikut ini:
            ${selectedDocumentInfo.keyword || ''}
            `
        });

        return {
            answer: `
            ${res.text === '' ? `Mohon maaf, system kami mendeteksi adanya pelanggaran pada Content Filtering, yang menyebabkan saya tidak bisa mengeluarkan jawaban lengkap atas pertanyaan anda :pray:\n\nBerikut ini adalah jawaban singkat yang bisa saya tampilkan\n\n${selectedDocumentInfo.answer}` : ''}            
    
            ${`${res.text}`.trim()}
            `,
            document: selectedDocumentInfo.document,
            keyword: selectedDocumentInfo.keyword
        }
    } catch (error) {
        return { answer: `Mohon maaf, terjadi kesalahan ketika memproses pertanyaan Anda, yang menyebabkan saya tidak bisa mengeluarkan jawaban lengkap atas pertanyaan Anda :pray:\n\nBerikut ini adalah jawaban singkat yang bisa saya tampilkan\n\n${selectedDocumentInfo.answer}` }
    }
}