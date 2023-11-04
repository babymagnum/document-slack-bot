import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as fs from "fs";
import { MultiRetrievalQAChain, loadQAMapReduceChain } from "langchain/chains";
import { LLMChainExtractor } from "langchain/retrievers/document_compressors/chain_extract";
import { ChatOpenAI } from "langchain/chat_models/openai";
import axios, { AxiosHeaders } from "axios";
import { DocumentInfo, FileInfo } from "./interfaces";
import { HumanMessage, SystemMessage } from "langchain/schema";
require('dotenv').config()

const slackToken = `${process.env.SLACK_BOT_TOKEN}`

const model = new ChatOpenAI({
    temperature: 0.5,
    topP: 0.9,
    maxTokens: -1,
    verbose: true,
    azureOpenAIApiKey: process.env.OPENAI_API_KEY,
    azureOpenAIApiVersion: process.env.OPENAI_API_VERSION,
    azureOpenAIApiDeploymentName: process.env.OPENAI_API_MODEL_NAME,
    azureOpenAIBasePath: process.env.OPENAI_API_BASE_URL,
});

const embeddings = new OpenAIEmbeddings({
    azureOpenAIApiKey: process.env.OPENAI_API_KEY,
    azureOpenAIApiVersion: process.env.OPENAI_API_VERSION,
    azureOpenAIApiDeploymentName: process.env.OPENAI_API_EMBEDDING_NAME,
    azureOpenAIBasePath: process.env.OPENAI_API_BASE_URL,
});

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

async function checkDocumentContainsQuestion(question: string, documentDescription: string): Promise<boolean> {
    try {
        const result = await model.call([
            new SystemMessage(`
            You're helpful assistant that will help me to check wheter the provided data contains answer from the user question or no
    
            Task:
            You will be provided with the data that may contains answer from the user question, your output only true or false
    
            Example Output:
            true
            `),
            new HumanMessage(`
            Data:
            ${documentDescription}
    
            Question:
            ${question}
            `),
        ]);
    
        return result.content.includes('true') ? true : false        
    } catch (error) {
        return false
    }    
}

export async function fetchDocumentDataV2(question: string): Promise<string | null> {
    try {
        const basePdf = "./pdf-sources/pdf/";
        const baseGenerated = "./pdf-sources/generated-pdf/";

        const documentsInfo: DocumentInfo[] = [
            {
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
                generatedPdfPath: `${baseGenerated}Udemy Acces Guideline`,
                description: "Gunakan dokumen ini untuk menjawab segala pertanyaan yang berkaitan tentang Udemy Access Guideline"
            },
            {
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
        ]

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

                const taggedDocs = docs.map((element) => {
                    element.metadata = { "source_file": `${fileName}` };
                    return element;
                });

                // Load the docs into the vector store    
                const vectorStore = await HNSWLib.fromDocuments(taggedDocs, embeddings);

                await vectorStore.save(value.generatedPdfPath);
            } else {
                console.log(`directory ${value} is exist`);
            }
        }

        let selectedDocumentInfo: DocumentInfo | null = null

        // search for document that may contains answer
        for (const document of documentsInfo) {
            const containsAnswer = await checkDocumentContainsQuestion(question, document.description)

            if (containsAnswer) {
                selectedDocumentInfo = document
                break
            }
        }

        if (selectedDocumentInfo === null) {
            return null
        }

        console.log(`selectedDocumentInfo ==> ${selectedDocumentInfo.generatedPdfPath}`)

        // continue for selected document
        const vectorStore = await HNSWLib.load(selectedDocumentInfo.generatedPdfPath, embeddings)
        const similarityDocuments = await vectorStore.similaritySearch(question)

        similarityDocuments.forEach((element, index) => {
            console.log(`Document ${index + 1} ==> ${element.pageContent}`)
        });

        const chain = loadQAMapReduceChain(model)

        const res = await chain.call({
            input_documents: similarityDocuments,
            question: question
        });

        return res.text
    } catch (error) {
        console.log(error)

        return null
    }
}

export async function fetchDocumentData(question: string): Promise<string | null> {
    const model = new ChatOpenAI({
        temperature: 0.4,
        topP: 0.9,
        maxTokens: -1,
        verbose: true,
        azureOpenAIApiKey: process.env.OPENAI_API_KEY,
        azureOpenAIApiVersion: process.env.OPENAI_API_VERSION,
        azureOpenAIApiDeploymentName: process.env.OPENAI_API_MODEL_NAME,
        azureOpenAIBasePath: process.env.OPENAI_API_BASE_URL,
    });

    const embeddings = new OpenAIEmbeddings({
        azureOpenAIApiKey: process.env.OPENAI_API_KEY,
        azureOpenAIApiVersion: process.env.OPENAI_API_VERSION,
        azureOpenAIApiDeploymentName: process.env.OPENAI_API_EMBEDDING_NAME,
        azureOpenAIBasePath: process.env.OPENAI_API_BASE_URL,
    });
    const baseCompressor = LLMChainExtractor.fromLLM(model);

    try {
        const basePdf = "./pdf-sources/pdf/";
        const baseGenerated = "./pdf-sources/generated-pdf/";

        let retrieversName = [];
        let retrieversDescription = [
            `
        Gunakan dokumen ini untuk menjawab segala pertanyaan yang berkaitan dengan Guideline For Assesor

        Dokumen ini terdiri dari beberapa subkonten, berikut adalah daftar subkonten dan data pendukung di dalam nya:

        1. Melakukan review dari hasil bukti bukti aspek skill yang dikumpulkan
        2. 1 on 1 Interview dengan engineer
        3. Melakukan penilaian terhadap hasil review dan 1on1
        4. Pengambilan keputusan
        `,
            `
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
        `,
            `
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
        `,
            `
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
        `,
            "Gunakan dokumen ini untuk menjawab segala pertanyaan yang berkaitan tentang Udemy Access Guideline",
            `
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
        `,
        ];
        let retrievers = [];

        const generatedPdfs = [
            `${baseGenerated}Guideline For Assesor`,
            `${baseGenerated}Intern Employee Guidelines`,
            `${baseGenerated}Skyshi - Project Management Guideline`,
            `${baseGenerated}Skyshi Guideline Engineer Progression`,
            `${baseGenerated}Udemy Acces Guideline`,
            `${baseGenerated}Probation Employee Guideline`,
        ];

        for (const value of generatedPdfs) {
            if (!fs.existsSync(value)) {
                console.log(`directory ${value} not exist`);

                const fileName = value.split('/').pop() || '';

                if (fileName === "") { continue; }

                const loader = new PDFLoader(`${basePdf}${fileName}.pdf`, { splitPages: false });

                // load and split the file to chunk/documents
                const docs = await loader.load();

                const splitter = new RecursiveCharacterTextSplitter({
                    chunkSize: 1000,
                    chunkOverlap: 1000 / 5,
                });

                const splittedDocs = await splitter.splitDocuments(docs);

                const taggedDocs = splittedDocs.map((element) => {
                    element.metadata = { "source_file": `${fileName}` };
                    return element;
                });

                // Load the docs into the vector store    
                const vectorStore = await HNSWLib.fromDocuments(taggedDocs, embeddings);

                await vectorStore.save(value);
            } else {
                console.log(`directory ${value} is exist`);
            }
        }

        for (const value of generatedPdfs) {
            const vectorStore = await HNSWLib.load(value, embeddings);

            const fileName = value.split('/').pop() || '';

            // const retriever = new ContextualCompressionRetriever({
            //     baseCompressor,
            //     baseRetriever: vectorStore.asRetriever(),
            // });

            retrievers.push(vectorStore.asRetriever());
            retrieversName.push(fileName);
        }

        const chain = MultiRetrievalQAChain.fromLLMAndRetrievers(model, {
            retrieverNames: retrieversName,
            retrieverDescriptions: retrieversDescription,
            retrievers,
            retrievalQAChainOpts: {
                returnSourceDocuments: true,
            },
        });

        const result = await chain.call({
            input: question
        });

        const resourceDocuments = result.sourceDocuments;

        if (resourceDocuments) {
            for (const value of resourceDocuments) {
                console.log(`metadata ==> ${value.metadata.source_file}`)
            }
        }

        return result.text
    } catch (error) {
        console.log(error)

        return null
    }
}