"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchDocumentData = exports.getFileInfo = void 0;
const openai_1 = require("langchain/embeddings/openai");
const pdf_1 = require("langchain/document_loaders/fs/pdf");
const text_splitter_1 = require("langchain/text_splitter");
const fs = __importStar(require("fs"));
const chains_1 = require("langchain/chains");
const openai_2 = require("langchain/chat_models/openai");
const axios_1 = __importStar(require("axios"));
const schema_1 = require("langchain/schema");
const multi_query_1 = require("langchain/retrievers/multi_query");
const faiss_1 = require("langchain/vectorstores/faiss");
require('dotenv').config();
const slackToken = `${process.env.SLACK_BOT_TOKEN}`;
const model = new openai_2.ChatOpenAI({
    temperature: 0.3,
    topP: 0.9,
    maxTokens: -1,
    verbose: true,
    azureOpenAIApiKey: process.env.OPENAI_API_KEY,
    azureOpenAIApiVersion: process.env.OPENAI_API_VERSION,
    azureOpenAIApiDeploymentName: process.env.OPENAI_API_MODEL_NAME,
    azureOpenAIBasePath: process.env.OPENAI_API_BASE_URL,
});
const embeddings = new openai_1.OpenAIEmbeddings({
    azureOpenAIApiKey: process.env.OPENAI_API_KEY,
    azureOpenAIApiVersion: process.env.OPENAI_API_VERSION,
    azureOpenAIApiDeploymentName: process.env.OPENAI_API_EMBEDDING_NAME,
    azureOpenAIBasePath: process.env.OPENAI_API_BASE_URL,
});
function getFileInfo(fileId) {
    return __awaiter(this, void 0, void 0, function* () {
        axios_1.default.AxiosHeaders;
        const res = yield axios_1.default.get(`https://slack.com/api/files.info?file=${fileId}`, {
            headers: new axios_1.AxiosHeaders({
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${slackToken}`
            })
        });
        if (res.status !== 200)
            return { ok: false };
        return {
            ok: true,
            url_download: res.data.file.url_private
        };
    });
}
exports.getFileInfo = getFileInfo;
function checkDocumentContainsQuestion(question, documentDescription) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield model.call([
                new schema_1.SystemMessage(`
            You're helpful assistant that will help me to check wheter the provided data contains answer from the user question or no
    
            Task:
            You will be provided with the data that may contains answer from the user question, your output only true or false
    
            Example Output:
            true
            `),
                new schema_1.HumanMessage(`
            Data:
            ${documentDescription}
    
            Question:
            ${question}
            `),
            ]);
            return result.content.includes('true') ? true : false;
        }
        catch (error) {
            return false;
        }
    });
}
function fetchDocumentData(question) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const basePdf = "./pdf-sources/pdf/";
            const baseGenerated = "./pdf-sources/generated-pdf/";
            const documentsInfo = [
                {
                    originPdfPath: `${basePdf}Guideline For Assesor.pdf`,
                    generatedPdfPath: `${baseGenerated}Guideline For Assesor`,
                    description: `
                Gunakan dokumen ini untuk menjawab segala pertanyaan yang berkaitan dengan Guideline For Assesor
        
                Dokumen ini terdiri dari beberapa subkonten, berikut adalah daftar subkonten dan data pendukung di dalam nya:
        
                1. Melakukan review dari hasil bukti bukti aspek skill yang dikumpulkan
                2. 1 on 1 Interview dengan engineer
                3. Melakukan penilaian terhadap hasil review dan 1on1
                4. Pengambilan keputusan
                `
                },
                {
                    originPdfPath: `${basePdf}Intern Employee Guidelines.pdf`,
                    generatedPdfPath: `${baseGenerated}Intern Employee Guidelines`,
                    description: `
                Gunakan dokumen ini untuk menjawab segala pertanyaan yang berkaitan dengan Intern Employee Guideline
        
                Dokumen ini terdiri dari beberapa subkonten, berikut adalah daftar nya:
        
                1. Intern Employee Guideline:
                    - Pedoman Umum
                    - Hari kerja, jam kerja, dan lembur
                    - Pedoman etika kerja
                    - Pedoman izin sakit
                    - Pedoman pembuatan artikel medium skyshi
                    - Pedoman meeting online
                    - Tata cara presentasi
        
                2. Onboarding Task Probation
                    - Menjelaskan project/klien retain yang akan di assign
                    - Menjelaskan dokumen terkait
                    - Etika komunikasi dengan tim dan klien dalam project
                    - Penjelasan teknis oleh Lead Project
                
                3. Fundamental Skills
                    - Mindset seorang engineer di skyshi
                    - Contoh dokumen bisnis proses
                    - Pedoman tools
                    - Pedoman deployment
                    - Pedoman project management
                `
                },
                {
                    originPdfPath: `${basePdf}Skyshi - Project Management Guideline.pdf`,
                    generatedPdfPath: `${baseGenerated}Skyshi - Project Management Guideline`,
                    description: `
                Gunakan dokumen ini untuk menjawab segala pertanyaan yang berkaitan dengan Skyshi - Project Management Guideline
        
                Dokumen ini terdiri dari beberapa subkonten, berikut adalah daftar nya:
        
                1. Software Lifecycle:
                    - Project lifecycle
        
                2. Longterm lifecycle: Project + product
        
                3. Project Management Guideline:
                    - Pedoman pelaksanaan project
                        * Tahap requirement gathering
                        * Tahap inisiasi
                        * Tahap development
                        * Tahap deployment
                    - Pedoman request improvement dan bug di live site
                    - Pedoman request improvement di ongoing project
                `
                },
                {
                    originPdfPath: `${basePdf}Skyshi Guideline Engineer Progression.pdf`,
                    generatedPdfPath: `${baseGenerated}Skyshi Guideline Engineer Progression`,
                    description: `
                Gunakan dokumen ini untuk menjawab segala pertanyaan yang berkaitan dengan Skyshi Guideline Engineer Progression
        
                Dokumen ini terdiri dari beberapa subkonten, berikut adalah daftar nya:
        
                1. Assesment
                    - Pengumpulan bukti untuk assesment
                    - Jenis Jenis Bukti yang dikumpulkan Dan Proses pengumpulan bukti
                    - Proses Assessment
                    - Skill Apa yang harus dibuktikan
                    - Proses Promosi ke Level Selanjutnya
        
                2. LEVEL DEVELOPER
        
                3. SKILLS
                    - COMMUNICATION
                    - DOCUMENTATION            
                    - PLANNING, DELIVERY & ESTIMATION            
                    - DEBUGGING & TECHNICAL PROBLEM SOLVING
                    - LANGUAGE KNOWLEDGE                
                        * Frontend (React)
                        * Frontend (Vue)
                        * Mobile (React native)
                        * Mobile (Flutter)
                        * Backend (Node.js)
                        * Backend (Golang)            
                    - TECHNICAL QUALITY            
                    - TOOLING        
                    - PERFORMANCE            
                    - FRONT END & MOBILE FOCUSED                
                    - BACKEND TECHNICAL FOCUSED
                `
                },
                {
                    originPdfPath: `${basePdf}Udemy Acces Guideline.pdf`,
                    generatedPdfPath: `${baseGenerated}Udemy Acces Guideline`,
                    description: "Gunakan dokumen ini untuk menjawab segala pertanyaan yang berkaitan tentang Udemy Access Guideline"
                },
                {
                    originPdfPath: `${basePdf}Probation Employee Guideline.pdf`,
                    generatedPdfPath: `${baseGenerated}Probation Employee Guideline`,
                    description: `
                Gunakan dokumen ini untuk menjawab segala pertanyaan yang berkaitan dengan Probation Employee Guideline
        
                Dokumen ini terdiri dari beberapa subkonten, berikut adalah daftar nya:
        
                1. Probation Employee Guideline:
                    - Project lifecycle
                    - Pedoman Umum
                    - Hari Kerja, Jam Kerja, dan Lembur
                    - Pedoman Etika Kerja
                    - Pedoman Kontrak Probation
                    - Kontrak karyawan probation berisi Nama Lengkap, Tempat/tanggal lahir, Alamat dan periode probation terhitung dari hari pertama masuk hingga tiga bulan mendatang
                    - Pedoman Pembuatan Email Baru dan Akses Internet
                    - Pengupahan Karyawan
                    - Pedoman Pendaftaran BPJS Kesehatan dan Ketenagakerjaan
                    - Pedoman Penggunaan Kartu BPJS Kesehatan
                    - Pedoman Pengajuan Izin/Cuti
                    - Pedoman Izin Sakit
                    - Pedoman Pembuatan Artikel Medium Skyshi
                    - Pedoman Penggunaan Google Hangout dan Google Meet
                    - Google Meet
                    - Tata Cara Presentasi
        
                2. Fundamental Skills
                    - Mindset Seorang Engineer di Skyshi
                    - Karakter Aplikasi yang Dibangun Skyshi
                    - Pedoman Tools
                    - Pedoman Development
                    - Pedoman Project Management
                `
                }
            ];
            // check if all pdf is saved locally
            for (const value of documentsInfo) {
                if (!fs.existsSync(value.generatedPdfPath)) {
                    console.log(`directory ${value} not exist`);
                    const fileName = value.generatedPdfPath.split('/').pop() || '';
                    if (fileName === "") {
                        continue;
                    }
                    const loader = new pdf_1.PDFLoader(`${basePdf}${fileName}.pdf`, { splitPages: false });
                    // load and split the file to chunk/documents
                    const docs = yield loader.loadAndSplit(new text_splitter_1.RecursiveCharacterTextSplitter({
                        chunkSize: 1000,
                        chunkOverlap: 1000 / 5,
                    }));
                    const vectorStore = yield faiss_1.FaissStore.fromDocuments(docs, embeddings);
                    yield vectorStore.save(value.generatedPdfPath);
                }
                else {
                    console.log(`directory ${value} is exist`);
                }
            }
            let selectedDocumentInfo = null;
            // search for document that may contains answer
            for (const document of documentsInfo) {
                const containsAnswer = yield checkDocumentContainsQuestion(question, document.description);
                if (containsAnswer) {
                    selectedDocumentInfo = document;
                    break;
                }
            }
            if (selectedDocumentInfo === null)
                return null;
            console.log(`selectedDocumentInfo ==> ${selectedDocumentInfo.generatedPdfPath}`);
            // continue for selected document
            const vectorStore = yield faiss_1.FaissStore.load(selectedDocumentInfo.generatedPdfPath, embeddings);
            const retriever = multi_query_1.MultiQueryRetriever.fromLLM({
                llm: model,
                retriever: vectorStore.asRetriever(),
            });
            const similarityDocuments = yield retriever.getRelevantDocuments(question);
            const chain = (0, chains_1.loadQAMapReduceChain)(model);
            const res = yield chain.call({
                input_documents: similarityDocuments,
                question: question
            });
            return res.text;
        }
        catch (error) {
            console.log(error);
            return null;
        }
    });
}
exports.fetchDocumentData = fetchDocumentData;
