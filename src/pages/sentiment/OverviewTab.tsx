import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import {
  BarChart3,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import {
  sentimentApi,
  type SentimentStats,
} from "@/lib/sentiment-api-client";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";
import { getChartColors } from "@/lib/chart-theme";
import { Card } from "@/components/ui/Card";
import { Section, StatStrip } from "@/components/ui/Section";
import { SentimentBadge } from "./SentimentPage";

/* --- Tab 1: Overview --- */

type ProductMention = { product_name: string; total: number };

// Hardcoded cross-mention counts, broken down by which lineup's posts the comments were on: how
// often each MMKSI lineup is name-dropped in comments posted under a *different* lineup's content
// (e.g. someone asks about L300 while commenting on a Pajero Sport post). Not a total mention/volume
// count — "All Products" sums cross-mentions across every post; picking one lineup narrows it to what
// its own commenters bring up. Xpander and Xpander Cross never appear as a post's own lineup in this
// export, so they have no breakdown (falls back to an empty state, not the "All Products" aggregate).
// Source: mitra.sentiment.service/absa_export_full.json, details[].mentioned_products where
// type == "mitsubishi" and name matches a product lineup exactly (generated_at 2026-07-22 11:36 UTC).
// Update this list manually by re-running the ABSA export script when a fresh snapshot is needed.
const PRODUCT_MENTIONS_BY_SOURCE: Record<string, ProductMention[]> = {
  "All Products": [
    { product_name: "Xpander", total: 424 },
    { product_name: "Xpander Cross", total: 81 },
    { product_name: "Xforce", total: 74 },
    { product_name: "L300", total: 29 },
    { product_name: "Pajero Sport", total: 22 },
    { product_name: "Triton", total: 5 },
    { product_name: "Destinator", total: 2 },
  ],
  Destinator: [
    { product_name: "Xpander", total: 405 },
    { product_name: "Xpander Cross", total: 79 },
    { product_name: "Xforce", total: 74 },
    { product_name: "Pajero Sport", total: 18 },
    { product_name: "L300", total: 2 },
    { product_name: "Triton", total: 2 },
  ],
  L300: [
    { product_name: "Pajero Sport", total: 3 },
    { product_name: "Xpander", total: 1 },
    { product_name: "Triton", total: 1 },
  ],
  "Pajero Sport": [
    { product_name: "L300", total: 21 },
    { product_name: "Xpander", total: 5 },
    { product_name: "Triton", total: 2 },
    { product_name: "Xpander Cross", total: 1 },
  ],
  Triton: [
    { product_name: "L300", total: 4 },
    { product_name: "Pajero Sport", total: 1 },
    { product_name: "Xpander", total: 1 },
  ],
  Xforce: [
    { product_name: "Xpander", total: 12 },
    { product_name: "Destinator", total: 2 },
    { product_name: "L300", total: 2 },
    { product_name: "Xpander Cross", total: 1 },
  ],
};

type AspectSentimentSnapshot = {
  totalComments: number;
  aspectsDetected: number;
  needsManualReview: number;
  perAspect: { aspect: string; positive: number; neutral: number; negative: number }[];
};

// Hardcoded ABSA aspect-sentiment summary, broken down per product lineup (script output, not DB-backed).
// Source: mitra.sentiment.service/absa_export_full.json (generated_at 2026-07-22 11:36 UTC, model gpt-5.6-terra).
// "aspectsDetected" counts comments with >=1 aspect detected (matches the json's own summary.aspects_detected
// definition). Update these values manually by re-running the ABSA export script when a fresh snapshot is needed.
const ASPECT_SENTIMENT_BY_PRODUCT: Record<string, AspectSentimentSnapshot> = {
  "All Products": {
    totalComments: 7569,
    aspectsDetected: 4657,
    needsManualReview: 33,
    perAspect: [
      { aspect: "Harga", positive: 65, neutral: 1266, negative: 209 },
      { aspect: "Exterior", positive: 748, neutral: 292, negative: 221 },
      { aspect: "Mesin", positive: 170, neutral: 395, negative: 218 },
      { aspect: "Other: ketersediaan unit", positive: 5, neutral: 297, negative: 23 },
      { aspect: "Interior", positive: 61, neutral: 84, negative: 53 },
      { aspect: "Fitur Teknologi", positive: 34, neutral: 76, negative: 55 },
      { aspect: "Aftersell service", positive: 4, neutral: 24, negative: 19 },
      { aspect: "Fitur ADAS", positive: 3, neutral: 6, negative: 8 },
    ],
  },
  Destinator: {
    totalComments: 2879,
    aspectsDetected: 1576,
    needsManualReview: 9,
    perAspect: [
      { aspect: "Harga", positive: 23, neutral: 402, negative: 102 },
      { aspect: "Exterior", positive: 227, neutral: 90, negative: 112 },
      { aspect: "Mesin", positive: 54, neutral: 144, negative: 100 },
      { aspect: "Other: ketersediaan unit", positive: 4, neutral: 87, negative: 14 },
      { aspect: "Interior", positive: 29, neutral: 31, negative: 33 },
      { aspect: "Fitur Teknologi", positive: 15, neutral: 31, negative: 26 },
      { aspect: "Aftersell service", positive: 2, neutral: 9, negative: 10 },
      { aspect: "Fitur ADAS", positive: 2, neutral: 3, negative: 5 },
    ],
  },
  L300: {
    totalComments: 1466,
    aspectsDetected: 907,
    needsManualReview: 10,
    perAspect: [
      { aspect: "Exterior", positive: 171, neutral: 85, negative: 29 },
      { aspect: "Harga", positive: 8, neutral: 172, negative: 17 },
      { aspect: "Mesin", positive: 47, neutral: 80, negative: 45 },
      { aspect: "Other: ketersediaan unit", positive: 0, neutral: 48, negative: 2 },
      { aspect: "Interior", positive: 9, neutral: 21, negative: 8 },
      { aspect: "Fitur Teknologi", positive: 2, neutral: 12, negative: 2 },
      { aspect: "Aftersell service", positive: 2, neutral: 6, negative: 1 },
    ],
  },
  "Pajero Sport": {
    totalComments: 1275,
    aspectsDetected: 789,
    needsManualReview: 4,
    perAspect: [
      { aspect: "Harga", positive: 11, neutral: 275, negative: 50 },
      { aspect: "Exterior", positive: 93, neutral: 36, negative: 16 },
      { aspect: "Mesin", positive: 27, neutral: 66, negative: 33 },
      { aspect: "Other: ketersediaan unit", positive: 0, neutral: 70, negative: 2 },
      { aspect: "Interior", positive: 4, neutral: 13, negative: 4 },
      { aspect: "Fitur Teknologi", positive: 2, neutral: 4, negative: 2 },
      { aspect: "Aftersell service", positive: 0, neutral: 4, negative: 1 },
      { aspect: "Fitur ADAS", positive: 0, neutral: 2, negative: 1 },
    ],
  },
  Triton: {
    totalComments: 1260,
    aspectsDetected: 871,
    needsManualReview: 7,
    perAspect: [
      { aspect: "Harga", positive: 5, neutral: 305, negative: 13 },
      { aspect: "Exterior", positive: 149, neutral: 60, negative: 20 },
      { aspect: "Mesin", positive: 22, neutral: 71, negative: 19 },
      { aspect: "Other: ketersediaan unit", positive: 0, neutral: 67, negative: 3 },
      { aspect: "Fitur Teknologi", positive: 1, neutral: 8, negative: 9 },
      { aspect: "Interior", positive: 3, neutral: 7, negative: 5 },
      { aspect: "Aftersell service", positive: 0, neutral: 5, negative: 5 },
    ],
  },
  Xforce: {
    totalComments: 689,
    aspectsDetected: 514,
    needsManualReview: 3,
    perAspect: [
      { aspect: "Exterior", positive: 108, neutral: 21, negative: 44 },
      { aspect: "Harga", positive: 18, neutral: 112, negative: 27 },
      { aspect: "Mesin", positive: 20, neutral: 34, negative: 21 },
      { aspect: "Fitur Teknologi", positive: 14, neutral: 21, negative: 16 },
      { aspect: "Interior", positive: 16, neutral: 12, negative: 3 },
      { aspect: "Other: ketersediaan unit", positive: 1, neutral: 25, negative: 2 },
      { aspect: "Fitur ADAS", positive: 1, neutral: 1, negative: 2 },
      { aspect: "Aftersell service", positive: 0, neutral: 0, negative: 2 },
    ],
  },
};

type AspectCommentExample = { text: string; conf: number };
type AspectCommentBucket = Record<"positive" | "neutral" | "negative", AspectCommentExample[]>;

// Sample raw comments backing each aspect+polarity cell of ASPECT_SENTIMENT_BY_PRODUCT above, so the
// "Sentimen per aspek" chart can drill down into evidence on click instead of just showing counts.
// Source: mitra.sentiment.service/absa_export_full.json, details[].aspects[] joined back to the parent
// comment's content (generated_at 2026-07-22 11:36 UTC, model gpt-5.6-terra). Picks the top 2
// highest-confidence, non-`needs_manual_review` comments per (product, aspect, polarity) — those
// low-confidence ones already surface in the separate "Perlu Review" queue (NEEDS_REVIEW_COMMENTS)
// instead of being duplicated here. Raw/unedited text, same convention as NEEDS_REVIEW_COMMENTS.
// Update by re-running the ABSA export script when a fresh snapshot is needed.
const ASPECT_COMMENT_EXAMPLES_BY_PRODUCT: Record<string, Record<string, AspectCommentBucket>> = {
  "All Products": {
    "Harga": {
      "positive": [
        { "text": "punya yg putih beli november tahun lalu harga 405 juta (harga Batam lebih murah 60 juta karena kawasan ftz)", "conf": 98 },
        { "text": "masak harga cuma segitu murah amat boss", "conf": 97 }
      ],
      "neutral": [
        { "text": "boleh kan tanya dulu harganya.💪💪💪💪💪💪", "conf": 99 },
        { "text": "brp harganya mas??", "conf": 99 }
      ],
      "negative": [
        { "text": "Pajero ya Allah mahal harganya pajaknya juga mahal ......ya Allah apa aku bisaaaa😳😳😳", "conf": 99 },
        { "text": "harga barunya kemahalan", "conf": 98 }
      ]
    },
    "Exterior": {
      "positive": [
        { "text": "warna biru nya keren...", "conf": 99 },
        { "text": "ganteng banget l300 nya bg 🔥🔥🔥", "conf": 99 }
      ],
      "neutral": [
        { "text": "ada warnna putih ga", "conf": 99 },
        { "text": "Ada warna putih tidak?", "conf": 99 }
      ],
      "negative": [
        { "text": "[Sticker] minus nya di lampu blkg, kecil bgt", "conf": 98 },
        { "text": "jelek oyy desainnya", "conf": 98 }
      ]
    },
    "Mesin": {
      "positive": [
        { "text": "intinya destinator senyaman keinginan.. tenaga besar dan irit👍", "conf": 98 },
        { "text": "Saya sudah pakai Destinator ini BBM irit 15:1 lumayan hemat.", "conf": 98 }
      ],
      "neutral": [
        { "text": "perbedaan mesin l300 dan pajero sport", "conf": 99 },
        { "text": "udah turbo diesel gak tu om?", "conf": 98 }
      ],
      "negative": [
        { "text": "jebol mesin L300 euro 4,usia 33 bulan, produk gagal ..", "conf": 99 },
        { "text": "buat Medan tanjakan lemot fwd,terlalu lemah buat mesin di ukuranya", "conf": 98 }
      ]
    },
    "Other: ketersediaan unit": {
      "positive": [
        { "text": "Semoga tidak lama lagi rilis di Indonesia.", "conf": 88 },
        { "text": "tinggal tunggu unit.. alhamdulillah", "conf": 82 }
      ],
      "neutral": [
        { "text": "Msih ada unitnya mas?", "conf": 98 },
        { "text": "masih ready mas?", "conf": 98 }
      ],
      "negative": [
        { "text": "Punyaku blm datang2 inden udah hampir 1 bulan😫", "conf": 98 },
        { "text": "hàng Mitsubishi chậm về VN quá, giới thiệu rầm rộ mà lâu quá mới về", "conf": 97 }
      ]
    },
    "Interior": {
      "positive": [
        { "text": "อินทีเรียข้างในสวยมากกกกกกกครับ", "conf": 99 },
        { "text": "Alhamdulillah udh punya destinator ultimate hitam..gak nyesel beli ini,kabin besar,nyaman bgt,tarikannya enak tanjakan,tikungan,jalan rusak alhamdulillah aman bgt🥰🥰🥰", "conf": 98 }
      ],
      "neutral": [
        { "text": "Ada brp kursi ya kalau destinator?", "conf": 99 },
        { "text": "yg brp sit ya bozku", "conf": 98 }
      ],
      "negative": [
        { "text": "exterior sangar\ntapi interiornya culun", "conf": 98 },
        { "text": "Ruang kaki sempit", "conf": 98 }
      ]
    },
    "Fitur Teknologi": {
      "positive": [
        { "text": "Head unit nya keren om", "conf": 99 },
        { "text": "Kebetulan punya dua2nya, teknologi sama fitur jauhh lebih unggul Xforce gais 😭🙏", "conf": 96 }
      ],
      "neutral": [
        { "text": "Penasaran sama tampilan android auto sama aple car play ketika diaktifkan..", "conf": 99 },
        { "text": "andorid auto dan carplay nya wireless ?", "conf": 99 }
      ],
      "negative": [
        { "text": "Sayangnya gak sunroof", "conf": 98 },
        { "text": "Ngak ada camera 360 😁", "conf": 98 }
      ]
    },
    "Aftersell service": {
      "positive": [
        { "text": "mobil belajar pertama kali l300\nbenar bisa itu semua bisa 😂\nmodel jadul tapi spare part bnyk", "conf": 94 },
        { "text": "asiknya mobil jepangan ..part modif bejibun 😂😂👍👍👍👍", "conf": 90 }
      ],
      "neutral": [
        { "text": "Bengkel daerah mana bosku", "conf": 98 },
        { "text": "adakah setiap pembelian New Triton dpat free service 3tahun??atau ada T&S", "conf": 96 }
      ],
      "negative": [
        { "text": "Sparepart mahal , langka pula, gimana tuh MITSUBISHI ?", "conf": 98 },
        { "text": "sparepart nya langkah banget", "conf": 98 }
      ]
    },
    "Fitur ADAS": {
      "positive": [
        { "text": "bukan macam brand sebelah yang nama PROTON perg buang adas🤣😅", "conf": 67 },
        { "text": "Haaa dok kondem sgt xdak adas la xckup airbag lah ni dy mai dah.. x90 pulak xdk adas skarang😆", "conf": 61 }
      ],
      "neutral": [
        { "text": "mantap cara nyetir nya bs dapat 1:22, saya mudik pakai Xforce jakarta-surabaya dapat nya 1:18-20 full AC, mungkin karena muatan dan sesekali aktifin ADAS.", "conf": 85 },
        { "text": "matiin dlu TCS nya wkwk", "conf": 82 }
      ],
      "negative": [
        { "text": "Itu sama sebelahnya si ertiga fiturnya mirip lo sama sama jadul gapunya adas tapi xp cross 80 juta lebih mahal😹", "conf": 91 },
        { "text": "itu ultimate biasa, bukan ultimate ds yang di video ini ga ada sensor kamera atas dan ga ada radar di depan", "conf": 86 }
      ]
    }
  },
  "Destinator": {
    "Harga": {
      "positive": [
        { "text": "punya yg putih beli november tahun lalu harga 405 juta (harga Batam lebih murah 60 juta karena kawasan ftz)", "conf": 98 },
        { "text": "masak harga cuma segitu murah amat boss", "conf": 97 }
      ],
      "neutral": [
        { "text": "Harga cash brp kak", "conf": 99 },
        { "text": "destinator brp kak", "conf": 99 }
      ],
      "negative": [
        { "text": "masih tingi ya kk harganja", "conf": 97 },
        { "text": "om... harganya udh naik skrg, aku kena 512 om yg premium... heee nyesel belinya gak pas launching🤭", "conf": 97 }
      ]
    },
    "Exterior": {
      "positive": [
        { "text": "warna biru nya keren...", "conf": 99 },
        { "text": "KA cantik banget 😍", "conf": 98 }
      ],
      "neutral": [
        { "text": "warna apa ini kk", "conf": 98 },
        { "text": "mobil x force sama mobil destinator lampu belakang nya besar mana sih terutama di bagian lampu sein nya", "conf": 96 }
      ],
      "negative": [
        { "text": "[Sticker] minus nya di lampu blkg, kecil bgt", "conf": 98 },
        { "text": "destinator lampu rem nya ga terang+kecil cok", "conf": 98 }
      ]
    },
    "Mesin": {
      "positive": [
        { "text": "intinya destinator senyaman keinginan.. tenaga besar dan irit👍", "conf": 98 },
        { "text": "Saya sudah pakai Destinator ini BBM irit 15:1 lumayan hemat.", "conf": 98 }
      ],
      "neutral": [
        { "text": "apakah mesin nya sudah hybrid?", "conf": 98 },
        { "text": "Singkat saja,,matic atau manual ini kak??", "conf": 98 }
      ],
      "negative": [
        { "text": "buat Medan tanjakan lemot fwd,terlalu lemah buat mesin di ukuranya", "conf": 98 },
        { "text": "Boros BBM\n1000km habis 140 Liter", "conf": 98 }
      ]
    },
    "Other: ketersediaan unit": {
      "positive": [
        { "text": "Semoga tidak lama lagi rilis di Indonesia.", "conf": 88 },
        { "text": "alhamdulilah udah mendarat", "conf": 80 }
      ],
      "neutral": [
        { "text": "masih ready kah kaaa", "conf": 96 },
        { "text": "Masih ready ga kak?", "conf": 96 }
      ],
      "negative": [
        { "text": "Punyaku blm datang2 inden udah hampir 1 bulan😫", "conf": 98 },
        { "text": "hàng Mitsubishi chậm về VN quá, giới thiệu rầm rộ mà lâu quá mới về", "conf": 97 }
      ]
    },
    "Interior": {
      "positive": [
        { "text": "Alhamdulillah udh punya destinator ultimate hitam..gak nyesel beli ini,kabin besar,nyaman bgt,tarikannya enak tanjakan,tikungan,jalan rusak alhamdulillah aman bgt🥰🥰🥰", "conf": 98 },
        { "text": "aku ultimate inden 3,5 bulan..mantap..tapi gpp mobilnya senyaman ituuu😁👍👍", "conf": 98 }
      ],
      "neutral": [
        { "text": "Ada brp kursi ya kalau destinator?", "conf": 99 },
        { "text": "yg brp sit ya bozku", "conf": 98 }
      ],
      "negative": [
        { "text": "sempitt baris 3", "conf": 98 },
        { "text": "jadul interiornya ckck", "conf": 96 }
      ]
    },
    "Fitur Teknologi": {
      "positive": [
        { "text": "Head unit nya keren om", "conf": 99 },
        { "text": "Sunroof ini yg memiliki nilai tambah apalagi kl harganya nanti di bawah 500jt", "conf": 94 }
      ],
      "neutral": [
        { "text": "Penasaran sama tampilan android auto sama aple car play ketika diaktifkan..", "conf": 99 },
        { "text": "andorid auto dan carplay nya wireless ?", "conf": 99 }
      ],
      "negative": [
        { "text": "Tp ga ada sunroof", "conf": 98 },
        { "text": "385 spion ga elektrik kebanting bgt sama All New Veloz😭", "conf": 97 }
      ]
    },
    "Aftersell service": {
      "positive": [
        { "text": "asiknya mobil jepangan ..part modif bejibun 😂😂👍👍👍👍", "conf": 90 },
        { "text": "Pengerjaannya rapi dan profesional👍👍", "conf": 89 }
      ],
      "neutral": [
        { "text": "inden part nya berapa bulan kak", "conf": 90 },
        { "text": "ini asesorisnya konsumen bawa sendiri atau beli dibengkel resmi ?", "conf": 84 }
      ],
      "negative": [
        { "text": "Sparepart mahal , langka pula, gimana tuh MITSUBISHI ?", "conf": 98 },
        { "text": "sales mitsubitsi pada galak2 bgt co", "conf": 93 }
      ]
    },
    "Fitur ADAS": {
      "positive": [
        { "text": "bukan macam brand sebelah yang nama PROTON perg buang adas🤣😅", "conf": 67 },
        { "text": "Haaa dok kondem sgt xdak adas la xckup airbag lah ni dy mai dah.. x90 pulak xdk adas skarang😆", "conf": 61 }
      ],
      "neutral": [
        { "text": "BG SDH ad rem otomatis blum", "conf": 69 },
        { "text": "Mobil ini minumnya boleh apa aja om? Trs dg design sebagus itu blind spotnya aman ga ya om?", "conf": 66 }
      ],
      "negative": [
        { "text": "Itu sama sebelahnya si ertiga fiturnya mirip lo sama sama jadul gapunya adas tapi xp cross 80 juta lebih mahal😹", "conf": 91 },
        { "text": "Masih xde adas ke", "conf": 82 }
      ]
    }
  },
  "L300": {
    "Harga": {
      "positive": [
        { "text": "waduh harga nya mantap yak🤩", "conf": 94 },
        { "text": "harga pas bos", "conf": 93 }
      ],
      "neutral": [
        { "text": "berapa harga ya mas", "conf": 99 },
        { "text": "harga berapa bang", "conf": 99 }
      ],
      "negative": [
        { "text": "kok mahal amat harga nya", "conf": 98 },
        { "text": "suka banget sama mobilnya tapi ngga suka sama harganya😑", "conf": 96 }
      ]
    },
    "Exterior": {
      "positive": [
        { "text": "ganteng banget l300 nya bg 🔥🔥🔥", "conf": 99 },
        { "text": "modifnya simpel gak banyak setiker ,keren elegan mantap", "conf": 98 }
      ],
      "neutral": [
        { "text": "om izin nanya warna apa ya🤩🤩", "conf": 97 },
        { "text": "pelek pake punya apa om ?", "conf": 96 }
      ],
      "negative": [
        { "text": "L300 renek kemajuan dr tahun 45 sampai 2026 gitu2 terus model nya .sekarang yg lebih joss isuzu traga model nya ganteng irit lagi.", "conf": 96 },
        { "text": "bak nya tipis kayak kaleng", "conf": 93 }
      ]
    },
    "Mesin": {
      "positive": [
        { "text": "Bener jirr gua driver l300 gua make punya bos gua sampe heran tu mobil gk rusak rusak dh gitu konsumsi bbm super irit dah kayak motor🥰", "conf": 96 },
        { "text": "sya lebih suka kyak gini standart Velg.. Tapi mesin Joss Cumi Darat. Jadi Muatan Berat gak khawatir. Cuan dapat, Look Cakep Dapat. 😁😁🙏", "conf": 94 }
      ],
      "neutral": [
        { "text": "cara bedain mesin euro2, 3,4 drmananya ya? 🤔 kuliat2 bentukannya mirip semua.. sory blum prnah pegang l300 jd gk tau😅", "conf": 97 },
        { "text": "solar atau bensin", "conf": 97 }
      ],
      "negative": [
        { "text": "jebol mesin L300 euro 4,usia 33 bulan, produk gagal ..", "conf": 99 },
        { "text": "Euro 4 sering overheat", "conf": 98 }
      ]
    },
    "Other: ketersediaan unit": {
      "positive": [],
      "neutral": [
        { "text": "sudah sold out belum boss", "conf": 96 },
        { "text": "masih ada bos?", "conf": 95 }
      ],
      "negative": [
        { "text": "gk di jual bos", "conf": 80 },
        { "text": "heran ny daerah banten gk ada nii, l300 yg th lma,", "conf": 77 }
      ]
    },
    "Interior": {
      "positive": [
        { "text": "aku suka kabinnya bagus banget", "conf": 96 },
        { "text": "muat bayak lagi y", "conf": 88 }
      ],
      "neutral": [
        { "text": "seat pinten om ?", "conf": 98 },
        { "text": "berapa seat pak", "conf": 97 }
      ],
      "negative": [
        { "text": "tp dlm kabin tetap GK mewah .. tetap jadul bang", "conf": 98 },
        { "text": "kekurangan L300 interior kabin itu\"... aja gak ada perubahan terutama dasbornya", "conf": 97 }
      ]
    },
    "Fitur Teknologi": {
      "positive": [
        { "text": "candu sm soundnya😭🙏", "conf": 90 },
        { "text": "secangi ini ka L300 nya😂😂🥰👍", "conf": 72 }
      ],
      "neutral": [
        { "text": "itu asli bang sunroof nya", "conf": 96 },
        { "text": "berapa pasang sanrof nya ng", "conf": 92 }
      ],
      "negative": [
        { "text": "tinggal nambah i  Engine Start Stop Button . uhhhh rasa mobil sultan huhuhu", "conf": 72 },
        { "text": "kurang biled om😁", "conf": 62 }
      ]
    },
    "Aftersell service": {
      "positive": [
        { "text": "mobil belajar pertama kali l300\nbenar bisa itu semua bisa 😂\nmodel jadul tapi spare part bnyk", "conf": 94 },
        { "text": "jg pernah muatan 3.2 baut ke 5 putus tenyata bautnya ngga yg asli..yg asli diujung baut ada titik lubang", "conf": 62 }
      ],
      "neutral": [
        { "text": "info beli sepion nengdi mas", "conf": 92 },
        { "text": "cek harga lampu", "conf": 88 }
      ],
      "negative": [
        { "text": "::𝘱𝘪𝘬 𝘶𝘱 𝘯𝘦𝘬 𝘬𝘰𝘳 𝘴𝘢𝘬 𝘛𝘰𝘯 𝘳𝘶𝘨𝘪 𝘢𝘭𝘦 𝘵𝘶𝘬𝘶 𝘣𝘰𝘴𝘴 𝘴𝘰𝘢𝘭 𝘦 𝘱𝘦𝘳𝘢𝘸𝘢𝘵𝘢𝘯 𝘦 𝘣𝘢𝘳𝘢𝘯𝘨𝘬𝘢 𝘺𝘰 𝘭𝘢𝘳𝘢𝘯𝘨 𝘯𝘦𝘬 𝘥𝘪 𝘬𝘳𝘶𝘴 𝘯𝘦 𝘬𝘢𝘳𝘰 𝘰𝘱𝘦𝘳𝘢𝘴𝘪𝘰𝘯𝘢𝘭 𝘦 𝘺𝘰 𝘨𝘢𝘬 𝘯𝘶𝘵𝘶𝘵 𝘴𝘰𝘱𝘪𝘳 𝘦 𝘨𝘢𝘬 𝘬𝘦𝘣𝘢𝘨𝘪𝘢𝘯 𝘮𝘦𝘯𝘥𝘪𝘯𝘨 𝘢𝘣𝘰𝘵 𝘵𝘢𝘱𝘪 𝘰𝘯𝘨𝘬𝘰𝘴 𝘢𝘯 𝘮𝘢𝘴𝘶𝘬 🙏", "conf": 88 }
      ]
    },
    "Fitur ADAS": { "positive": [], "neutral": [], "negative": [] }
  },
  "Pajero Sport": {
    "Harga": {
      "positive": [
        { "text": "Asli murah ini..\nsoalnya kmrin saya bru dpt daerah sumsel/palembang 210jt", "conf": 96 },
        { "text": "Murah gurih kang😁", "conf": 93 }
      ],
      "neutral": [
        { "text": "boleh kan tanya dulu harganya.💪💪💪💪💪💪", "conf": 99 },
        { "text": "brp harganya mas??", "conf": 99 }
      ],
      "negative": [
        { "text": "Pajero ya Allah mahal harganya pajaknya juga mahal ......ya Allah apa aku bisaaaa😳😳😳", "conf": 99 },
        { "text": "kemahalan bung", "conf": 98 }
      ]
    },
    "Exterior": {
      "positive": [
        { "text": "ganteng banget yang putih😭", "conf": 98 },
        { "text": "ganteng pool", "conf": 98 }
      ],
      "neutral": [
        { "text": "ada warnna putih ga", "conf": 99 },
        { "text": "Ada warna putih tidak?", "conf": 99 }
      ],
      "negative": [
        { "text": "Pengalaman kilometer rendah malah karatan semua walaupun service record.. mending yang normal2 pemakaian aja..", "conf": 93 },
        { "text": "300 saya jual tipe yg sama. tp kaca depan retak di", "conf": 88 }
      ]
    },
    "Mesin": {
      "positive": [
        { "text": "Pajero GK sih karna performa mesin nya unggul dari pada Toyota Fortuner", "conf": 97 },
        { "text": "Dari Banyak Nya Koleksi Otomotif Di Negara Indonesia ✅✅\n- Unit Mobil Mewah Pajero Sport Dakar 4 x 4,, Masih Jadi Idaman Saya ✅✅\nKualitas & Performance nya Nyaman Sepanjang Jalan Raya ✅\nAnda Wajib Coba Sensasi nya ✅ 😎💃", "conf": 94 }
      ],
      "neutral": [
        { "text": "perbedaan mesin l300 dan pajero sport", "conf": 99 },
        { "text": "udah turbo diesel gak tu om?", "conf": 98 }
      ],
      "negative": [
        { "text": "gak enak mas..\nbensin 1 bulan bisa sampe 2jt an", "conf": 95 },
        { "text": "100 ribu,dapat 3,5 liter bos...berat sekarang.", "conf": 94 }
      ]
    },
    "Other: ketersediaan unit": {
      "positive": [],
      "neutral": [
        { "text": "masih ready mas?", "conf": 98 },
        { "text": "Masih ada gk om", "conf": 96 }
      ],
      "negative": [
        { "text": "antri nya panjang bg sama bae 😂😂🗿🗿", "conf": 88 },
        { "text": "ah yg bener min...ntr q ksna lu bilang udh habis", "conf": 84 }
      ]
    },
    "Interior": {
      "positive": [
        { "text": "pasti nyaman banget ya Ka😞", "conf": 83 },
        { "text": "berasa sedan 🔥🔥🔥", "conf": 72 }
      ],
      "neutral": [
        { "text": "ac tengah belakangnya ada ga ini om?", "conf": 98 },
        { "text": "Bagian dalam sudah leather semuakah kak?", "conf": 97 }
      ],
      "negative": [
        { "text": "Ruang kaki sempit", "conf": 98 },
        { "text": "2 2 nya sudah pernah pakai, tetap limbung kurang nyaman, jauh lebih nyaman di CRV gen 5...", "conf": 86 }
      ]
    },
    "Fitur Teknologi": {
      "positive": [
        { "text": "coba klw ada camera 360 sm layar tv ny berubah kaya mobil2 kluaran skrang lebih nagus", "conf": 94 },
        { "text": "minimal punya dulu ga sih. Baru bisa bandingin sama L300. Mesin nya walau sama, tapi tuningnya beda. Makanya output power beda. Lalu interior dan fitur mau disamakan dengan L300? Adminnya lucu😳", "conf": 68 }
      ],
      "neutral": [
        { "text": "untuk kamera 360 ada di type yg mana kk.?", "conf": 99 },
        { "text": "pajero dakar ultimate gak pake sunroof kah koko", "conf": 98 }
      ],
      "negative": [
        { "text": "backsound e kurang banter kang", "conf": 94 },
        { "text": "lah mana sanrof nya", "conf": 91 }
      ]
    },
    "Aftersell service": {
      "positive": [],
      "neutral": [
        { "text": "Bengkel daerah mana bosku", "conf": 98 },
        { "text": "Info bengkel bang", "conf": 92 }
      ],
      "negative": [
        { "text": "pajero exced. yg dakkar sering rewel", "conf": 70 }
      ]
    },
    "Fitur ADAS": {
      "positive": [],
      "neutral": [
        { "text": "matiin dlu TCS nya wkwk", "conf": 82 },
        { "text": "itu tcs nya masih nahan😂😂emang orang kalau punya mobil begini belum tentu tau fitur di mobilnya😂😂okb", "conf": 78 }
      ],
      "negative": []
    }
  },
  "Triton": {
    "Harga": {
      "positive": [
        { "text": "harga ny jug mantap kk😁", "conf": 96 },
        { "text": "solbus ... ramah di kantong kak 😳😳😳", "conf": 93 }
      ],
      "neutral": [
        { "text": "harga berapa om", "conf": 99 },
        { "text": "Harga pinten", "conf": 99 }
      ],
      "negative": [
        { "text": "kalau untuk lansir sawit nda cocok karena deslete mahal dia nda bisa solar sembarangan ke injektor nx mending beli ATV bensin lagi murah lagi kalau cuma usaha sawit saran saya rugi kita udah harga mencekeek", "conf": 91 },
        { "text": "dp nya besar dari pada dp Yg baru", "conf": 91 }
      ]
    },
    "Exterior": {
      "positive": [
        { "text": "exterior sangar\ntapi interiornya culun", "conf": 98 },
        { "text": "Ganteng bettt😭", "conf": 98 }
      ],
      "neutral": [
        { "text": "ini warna grey metalik atau apa.", "conf": 98 },
        { "text": "velg triton?", "conf": 98 }
      ],
      "negative": [
        { "text": "sayang bgt dah penyok samping nya", "conf": 96 },
        { "text": "bang solusi tutup bak rollerlid gk bisa di buka", "conf": 94 }
      ]
    },
    "Mesin": {
      "positive": [
        { "text": "ang lakas ng Makina nyan😁", "conf": 96 },
        { "text": "semua brend punya kelebihan masing\"\nselama pakai triton exced tenaga ny emg buas bost bawah ny enak ,\nhilux lebih bagus suspensi ny, kalau buat bost di bawah kurang responsif menurut ku", "conf": 94 }
      ],
      "neutral": [
        { "text": "Spil mesin nya om🙏", "conf": 98 },
        { "text": "kapasitass mesinnn bang brpa HP.?", "conf": 98 }
      ],
      "negative": [
        { "text": "suspension gak enak", "conf": 98 },
        { "text": "Suspensi keras kali om🗿", "conf": 97 }
      ]
    },
    "Other: ketersediaan unit": {
      "positive": [],
      "neutral": [
        { "text": "Msih ada unitnya mas?", "conf": 98 },
        { "text": "msh ada unit nya om?", "conf": 98 }
      ],
      "negative": [
        { "text": "di bali gak ada bang", "conf": 83 },
        { "text": "tp blum2 sampai Pekanbaru 😅", "conf": 82 }
      ]
    },
    "Interior": {
      "positive": [
        { "text": "untuk kenyamanan triton untuk ketangguhan hilux..", "conf": 88 },
        { "text": "memang lebih nyaman duduk di samping kiri😁😁😁", "conf": 72 }
      ],
      "neutral": [
        { "text": "muat brp orang bang\nada yang muat 16 orang?", "conf": 95 },
        { "text": "VT untuk interiornya kh bosku ??🙏🏻🙏🏻", "conf": 93 }
      ],
      "negative": [
        { "text": "exterior sangar\ntapi interiornya culun", "conf": 98 },
        { "text": "วัสดุภายในปรับปรุงหรือยัง เคยใช้ไททันแย่มาก เทียบกับค่ายอืน", "conf": 91 }
      ]
    },
    "Fitur Teknologi": {
      "positive": [
        { "text": "mantap itu di jalan bergelombang bisa mode senyap👍👍", "conf": 61 }
      ],
      "neutral": [
        { "text": "bng nyalain head unit untuk musiknya gimana😅", "conf": 98 },
        { "text": "head unitnya udah bisa nyambung ke hp?", "conf": 98 }
      ],
      "negative": [
        { "text": "musik nya kurang keras🗿", "conf": 96 },
        { "text": "Audio masih minjam tombol kompor gas 😂", "conf": 91 }
      ]
    },
    "Aftersell service": {
      "positive": [],
      "neutral": [
        { "text": "adakah setiap pembelian New Triton dpat free service 3tahun??atau ada T&S", "conf": 96 },
        { "text": "Tôi muốn mua cùm nhíp", "conf": 87 }
      ],
      "negative": [
        { "text": "sparepart nya langkah banget", "conf": 98 },
        { "text": "Jangan gagah aja bang saprepart nya juga jarang itu contoh has kokel ada kah a abang jual😂", "conf": 91 }
      ]
    },
    "Fitur ADAS": { "positive": [], "neutral": [], "negative": [] }
  },
  "Xforce": {
    "Harga": {
      "positive": [
        { "text": "Reasonable dgn harga, tahan je nafsu ni😅", "conf": 94 },
        { "text": "pernah ditawarin Kalau beli baru dan cash diskonnya sampai 80juta 🤣🤣", "conf": 94 }
      ],
      "neutral": [
        { "text": "bisikin harga nya om", "conf": 99 },
        { "text": "Masih ada gak bg? Brp harga cashnya?", "conf": 99 }
      ],
      "negative": [
        { "text": "harga barunya kemahalan", "conf": 98 },
        { "text": "Karena harganya gak worth it dengan fitur yg ditawarkan. Zaman awal rilis, orang larinya ke hrv/creta. Ditambah skrg kena gempuran mocin.", "conf": 98 }
      ]
    },
    "Exterior": {
      "positive": [
        { "text": "perghh cantik nie..😍😍😍", "conf": 98 },
        { "text": "ganteng bgt mobilnya😭", "conf": 98 }
      ],
      "neutral": [
        { "text": "Ini warna apa ya", "conf": 98 },
        { "text": "ni black or grey?", "conf": 97 }
      ],
      "negative": [
        { "text": "jelek oyy desainnya", "conf": 98 },
        { "text": "lampu sen belakang x force Kecil banget masa kalah sama Avanza", "conf": 97 }
      ]
    },
    "Mesin": {
      "positive": [
        { "text": "mantap cara nyetir nya bs dapat 1:22, saya mudik pakai Xforce jakarta-surabaya dapat nya 1:18-20 full AC, mungkin karena muatan dan sesekali aktifin ADAS.", "conf": 97 },
        { "text": "udh 2 tahun pake x force.. ga ada keluhan apa2, tenaga oke, kabin luas, baris 2 bs reclyning, sound dahsyat", "conf": 95 }
      ],
      "neutral": [
        { "text": "ini manual atau matic?", "conf": 98 },
        { "text": "ini ada yang manual gak", "conf": 98 }
      ],
      "negative": [
        { "text": "ukurannya kegedean mesinnya kekecilan, jadi underpower", "conf": 97 },
        { "text": "Come on la Mitsubishi. Time to be serious. Still using cvt & torsion beam.", "conf": 96 }
      ]
    },
    "Other: ketersediaan unit": {
      "positive": [
        { "text": "tinggal tunggu unit.. alhamdulillah", "conf": 82 }
      ],
      "neutral": [
        { "text": "Masih ready ?", "conf": 98 },
        { "text": "masih ada bg???", "conf": 97 }
      ],
      "negative": [
        { "text": "Exceed katanya ga ready", "conf": 84 },
        { "text": "asik dok lalu ja ni... sabaq² keta aku tak keluaq lagi... lama tunggu matt!!", "conf": 82 }
      ]
    },
    "Interior": {
      "positive": [
        { "text": "อินทีเรียข้างในสวยมากกกกกกกครับ", "conf": 99 },
        { "text": "udh 2 tahun pake x force.. ga ada keluhan apa2, tenaga oke, kabin luas, baris 2 bs reclyning, sound dahsyat", "conf": 97 }
      ],
      "neutral": [
        { "text": "Ini berapa jok sih", "conf": 98 },
        { "text": "Berpa baris kursinya", "conf": 98 }
      ],
      "negative": [
        { "text": "5.ac nya kurang.apalgi siang", "conf": 95 },
        { "text": "Catatan kalau acnya gak jalan ya", "conf": 91 }
      ]
    },
    "Fitur Teknologi": {
      "positive": [
        { "text": "Kebetulan punya dua2nya, teknologi sama fitur jauhh lebih unggul Xforce gais 😭🙏", "conf": 96 },
        { "text": "hah teknologi sm fitur jelas xforce lah??", "conf": 94 }
      ],
      "neutral": [
        { "text": "Kameranya berapa ?", "conf": 98 },
        { "text": "xforce punya power back door", "conf": 98 }
      ],
      "negative": [
        { "text": "Sayangnya gak sunroof", "conf": 98 },
        { "text": "Ngak ada camera 360 😁", "conf": 98 }
      ]
    },
    "Aftersell service": {
      "positive": [],
      "neutral": [],
      "negative": [
        { "text": "pajak lebih mahal, perawatan lebih mahal...gak sepadan sama iritnya", "conf": 90 },
        { "text": "Dorlock yg d hujat hanya org yg blm tau cara buka x force, dorlock itu gak perlu d sentuh, que dulu wktu pertama beli jg gak d kasih tau sama dealer, taunya dari youtube", "conf": 82 }
      ]
    },
    "Fitur ADAS": {
      "positive": [],
      "neutral": [
        { "text": "mantap cara nyetir nya bs dapat 1:22, saya mudik pakai Xforce jakarta-surabaya dapat nya 1:18-20 full AC, mungkin karena muatan dan sesekali aktifin ADAS.", "conf": 85 }
      ],
      "negative": [
        { "text": "itu ultimate biasa, bukan ultimate ds yang di video ini ga ada sensor kamera atas dan ga ada radar di depan", "conf": 86 },
        { "text": "orang² milih hrv , type terendah pun dapet adas", "conf": 69 }
      ]
    }
  }
};

type NeedsReviewComment = {
  comment_id: string;
  product_lineup: string;
  content: string;
  confidence: number;
  aspect: string;
  polarity: "positive" | "neutral" | "negative";
};

// Hardcoded list of the individual comments the ABSA export flagged `needs_manual_review: true`
// (aspect confidence too low to trust automatically), script output, not DB-backed.
// Source: mitra.sentiment.service/absa_export_full.json, details[] where needs_manual_review == true
// (generated_at 2026-07-22 11:36 UTC, model gpt-5.6-terra). aspect/polarity/confidence are all taken
// from that comment's lowest-confidence aspect (the one that actually triggered the review flag —
// only one flagged comment has >1 detected aspect). Update this list manually by re-running the
// ABSA export script when a fresh snapshot is needed. Thumbs feedback on these items is UI-only for
// now — not persisted anywhere.
const NEEDS_REVIEW_COMMENTS: NeedsReviewComment[] = [
  { comment_id: "44eed0b1-7964-45a9-a9b6-d0f0116f2eed", product_lineup: "L300", content: "mang 5jt ankat", confidence: 0.48, aspect: "Harga", polarity: "neutral" },
  { comment_id: "6907020a-8e48-413b-887b-db2c3ce7840b", product_lineup: "Xforce", content: "9999 km .. 9000 rb \u{1F602}", confidence: 0.53, aspect: "Other: jarak tempuh", polarity: "neutral" },
  { comment_id: "99cc3481-c3d2-4ff9-9f3f-dedbbb3d26a1", product_lineup: "L300", content: "@KikiCore ✪ bikin kaya gini elsapak nya sam kii", confidence: 0.54, aspect: "Exterior", polarity: "neutral" },
  { comment_id: "21628674-70c8-493d-895f-8810b58867b7", product_lineup: "L300", content: "opo ra ambles iki", confidence: 0.52, aspect: "Mesin", polarity: "negative" },
  { comment_id: "563fe9a4-91d7-4c94-b87b-462dddf971c1", product_lineup: "L300", content: "ennaan terga bang", confidence: 0.52, aspect: "Harga", polarity: "neutral" },
  { comment_id: "4f9e6324-963a-4dac-b889-114c536b3020", product_lineup: "Xforce", content: "udoh apekehei kamu..xforce ja pun", confidence: 0.52, aspect: "Exterior", polarity: "negative" },
  { comment_id: "3d4d63ef-1d93-40c8-918a-7a5beaed8c5d", product_lineup: "Triton", content: "Hancur jalur miri\u{1F602}", confidence: 0.52, aspect: "Mesin", polarity: "positive" },
  { comment_id: "57f58b1e-3340-4f2f-88b6-33d325d5ed83", product_lineup: "Destinator", content: "klo dari belakang masih gagah Innova", confidence: 0.53, aspect: "Exterior", polarity: "negative" },
  { comment_id: "6ebc8e6a-4ab0-432a-a15e-31361ae0be53", product_lineup: "Triton", content: "mudi kalu harga segitu kalo gk ada mesin nya", confidence: 0.48, aspect: "Harga", polarity: "negative" },
  { comment_id: "5fd7838c-8360-468b-a6c0-1d1f241a1d07", product_lineup: "Destinator", content: "5,5 ya min\u{1F601}", confidence: 0.53, aspect: "Harga", polarity: "neutral" },
  { comment_id: "824c4eff-b994-4afa-b217-8aec665282a0", product_lineup: "Triton", content: "Ku amoh tuh poh", confidence: 0.52, aspect: "Exterior", polarity: "negative" },
  { comment_id: "8ce3525c-b2a6-4ecb-a89d-0f332a0d7d52", product_lineup: "Destinator", content: "kalo penyok dikit bisa ga ka d x pander saya", confidence: 0.53, aspect: "Exterior", polarity: "neutral" },
  { comment_id: "5e237b58-25bb-4ec4-ab2a-4b58e0698b78", product_lineup: "Destinator", content: "xpander kamikaze", confidence: 0.52, aspect: "Exterior", polarity: "negative" },
  { comment_id: "b582ce13-90bb-4886-b5c1-0b01ac8c3141", product_lineup: "L300", content: "lah kok di eouro rusak nya", confidence: 0.48, aspect: "Other: keandalan", polarity: "negative" },
  { comment_id: "2f75a84e-d5af-49bc-966e-b1c4a332bbfa", product_lineup: "Triton", content: "wah mantap susun nya,banyak segitu blum berani saya bawa,sebab kawan kmi bukit", confidence: 0.5, aspect: "Mesin", polarity: "neutral" },
  { comment_id: "118f32db-b797-4ecc-9de7-70464aa89a12", product_lineup: "Pajero Sport", content: "yg terakhir anomali", confidence: 0.51, aspect: "Exterior", polarity: "negative" },
  { comment_id: "0bd283ce-88e2-4fa2-bd1b-90c49da89352", product_lineup: "L300", content: "kureng Jai nyan", confidence: 0.52, aspect: "Exterior", polarity: "negative" },
  { comment_id: "28b218e7-9441-457a-977f-2113a3572f96", product_lineup: "Pajero Sport", content: "seng nyopir anggi seng nang mburi gocelan rapet", confidence: 0.52, aspect: "Interior", polarity: "neutral" },
  { comment_id: "44a68bc0-3dd3-46af-ad7c-3b473af31513", product_lineup: "L300", content: "traga bisa goyang l300 sihh", confidence: 0.52, aspect: "Mesin", polarity: "positive" },
  { comment_id: "4077c09a-8828-4047-be05-ae8d7311d734", product_lineup: "Destinator", content: "cipta engine sendiri,mau cari yg sempurna buat tambahan sendiri\u{1F602}", confidence: 0.52, aspect: "Mesin", polarity: "neutral" },
  { comment_id: "5956d2ce-3a9b-46da-9e79-bbe2d1c383f6", product_lineup: "Triton", content: "Engah Mantaap. Biasa saja.", confidence: 0.46, aspect: "Exterior", polarity: "neutral" },
  { comment_id: "7143ff7c-6134-408e-bc63-c2bde808fc1e", product_lineup: "L300", content: "kui ben chiuuu mbok ganti apane mas??", confidence: 0.54, aspect: "Mesin", polarity: "neutral" },
  { comment_id: "4479936c-1ef3-435b-9de4-c6ed44f29364", product_lineup: "Xforce", content: "Seukuran sein vario \u{1F5FF}", confidence: 0.54, aspect: "Exterior", polarity: "negative" },
  { comment_id: "d97596a6-6af7-4cf5-beb5-49bd0a57b105", product_lineup: "Destinator", content: "barong disel GK cocok dibandingkan expander.", confidence: 0.5, aspect: "Mesin", polarity: "negative" },
  { comment_id: "bf7d4a54-2252-47b6-b895-fb332dcd0a1a", product_lineup: "Pajero Sport", content: "kali-kali.an itu mudah kan\noh jelas...???\nnggak...!!!\nini 4x4=800 juta.an\u{1F5FF}\u{1F5FF}\u{1F5FF}", confidence: 0.52, aspect: "Mesin", polarity: "negative" },
  { comment_id: "077593d3-4af1-4f1d-b035-ee94d696c719", product_lineup: "Triton", content: "ulh req engkah ka nose diak wai.. ambik laju tyr x terengkah tanah", confidence: 0.43, aspect: "Mesin", polarity: "negative" },
  { comment_id: "70abaf21-0aae-4a6c-9489-0a0b1e28bc69", product_lineup: "Pajero Sport", content: "malu sama calya klw Gk naik\u{1F602}", confidence: 0.54, aspect: "Other: citra sosial", polarity: "positive" },
  { comment_id: "6da604d1-73d7-4c8c-b903-5be7c910b994", product_lineup: "Destinator", content: "ditambah pake awe awe tangan aja gasii kakk? WKWKWK", confidence: 0.54, aspect: "Exterior", polarity: "negative" },
  { comment_id: "2a423369-3533-4864-a877-39fc15deb622", product_lineup: "Triton", content: "Pa rete boss stock lang ang baon", confidence: 0.51, aspect: "Harga", polarity: "neutral" },
  { comment_id: "3fba7fbc-50c6-4849-8580-6ad0f7c8356a", product_lineup: "L300", content: "kayanya gembring tuh", confidence: 0.52, aspect: "Exterior", polarity: "negative" },
  { comment_id: "9844bd67-9b0c-4aa6-ba35-7022ce2f8a05", product_lineup: "Destinator", content: "malah dibor... hadew", confidence: 0.54, aspect: "Exterior", polarity: "negative" },
  { comment_id: "d63c2635-94cb-4e20-92e7-cb96ea72aa1e", product_lineup: "L300", content: "ngeri", confidence: 0.45, aspect: "Exterior", polarity: "negative" },
  { comment_id: "8a59db66-80e7-4ddd-b706-364bf312591c", product_lineup: "Destinator", content: "tak masuk kot rasanye..", confidence: 0.5, aspect: "Exterior", polarity: "negative" },
];

// Canonical ABSA aspect list (absa_export_full.json's default_aspects) offered in the "Perlu Review"
// correction picker's aspect dropdown.
const REVIEW_ASPECT_OPTIONS = ["Harga", "Aftersell service", "Mesin", "Exterior", "Interior", "Fitur ADAS", "Fitur Teknologi"];

// Outline-pill variant of SentimentBadge's colors, used for the "Perlu Review" cards' polarity pill.
const POLARITY_OUTLINE_STYLES: Record<NeedsReviewComment["polarity"], string> = {
  positive: "border-status-success text-status-success",
  neutral: "border-blue-500 text-blue-600",
  negative: "border-status-error text-status-error",
};

// Maps the ECharts legend labels (Indonesian) to the aspect-sentiment snapshot field they control.
const ASPECT_LEGEND_FIELD = {
  Positif: "positive",
  Netral: "neutral",
  Negatif: "negative",
} as const;

export function OverviewTab({ selectedProduct, selectedProductName }: { selectedProduct?: string; selectedProductName?: string }) {
  const [days, setDays] = useState(0);
  const { theme } = useTheme();
  const chart = getChartColors(theme);

  // Thumbs feedback on "Perlu Review" items is UI-only for now — not persisted to a backend, since
  // there's no human-feedback storage for sentiment classification yet (see NEEDS_REVIEW_COMMENTS
  // above). Thumbs up = "AI got it right", dismisses the item from the list immediately. Thumbs down
  // = "AI got it wrong", opens an inline aspect+polarity correction picker; the item is only
  // dismissed once the correction is submitted (there's nowhere to send the correction to yet, so
  // submitting just clears it from the local review queue).
  const [dismissedReviewIds, setDismissedReviewIds] = useState<Set<string>>(new Set());
  const [correctingReviewId, setCorrectingReviewId] = useState<string | null>(null);
  const [correctionAspect, setCorrectionAspect] = useState("");
  const [correctionPolarity, setCorrectionPolarity] = useState<NeedsReviewComment["polarity"]>("neutral");

  const needsReviewComments = (selectedProductName
    ? NEEDS_REVIEW_COMMENTS.filter((c) => c.product_lineup === selectedProductName)
    : NEEDS_REVIEW_COMMENTS
  ).filter((c) => !dismissedReviewIds.has(c.comment_id));

  const dismissReviewItem = (commentId: string) => {
    setDismissedReviewIds((prev) => new Set(prev).add(commentId));
    setCorrectingReviewId((current) => (current === commentId ? null : current));
  };

  const openReviewCorrection = (c: NeedsReviewComment) => {
    if (correctingReviewId === c.comment_id) {
      setCorrectingReviewId(null);
      return;
    }
    setCorrectingReviewId(c.comment_id);
    setCorrectionAspect(c.aspect);
    setCorrectionPolarity(c.polarity);
  };

  const submitReviewCorrection = () => {
    if (correctingReviewId) dismissReviewItem(correctingReviewId);
  };

  // Which aspect-sentiment legend series are currently toggled on; used to sort bars
  // by the visible series' value (highest to lowest) when the user isolates one via the legend.
  const [aspectLegendSelected, setAspectLegendSelected] = useState<Record<string, boolean>>({
    Positif: true,
    Netral: true,
    Negatif: true,
  });

  // Which aspect+polarity segment of the "Sentimen per aspek" bar is drilled into — clicking a
  // segment shows the sample comments backing that classification below, replacing the old
  // Sentiment Distribution donut (which only showed aggregate counts, not evidence).
  const [drilldown, setDrilldown] = useState<{ aspect: string; polarity: "positive" | "neutral" | "negative" } | null>(null);
  // Reset the drilldown when the page-level product filter changes, since the selected aspect's
  // comment examples are scoped per product. Adjusting state during render (React's documented
  // pattern for "resetting state when a prop changes") instead of a useEffect avoids an extra render.
  const [drilldownResetKey, setDrilldownResetKey] = useState(selectedProductName);
  if (drilldownResetKey !== selectedProductName) {
    setDrilldownResetKey(selectedProductName);
    setDrilldown(null);
  }

  // Driven by the page-level product selector. The ABSA snapshot is a hardcoded export keyed by
  // product name (not product_lineup_id), so lineups without a dedicated snapshot (e.g. Xpander,
  // Xpander Cross) fall back to the "All Products" aggregate.
  const hasProductAbsa = !!(selectedProductName && ASPECT_SENTIMENT_BY_PRODUCT[selectedProductName]);
  const aspectSentimentSummary = hasProductAbsa
    ? ASPECT_SENTIMENT_BY_PRODUCT[selectedProductName!]
    : ASPECT_SENTIMENT_BY_PRODUCT["All Products"];

  const commentExamplesScope = hasProductAbsa
    ? ASPECT_COMMENT_EXAMPLES_BY_PRODUCT[selectedProductName!]
    : ASPECT_COMMENT_EXAMPLES_BY_PRODUCT["All Products"];
  const drilldownCount = drilldown
    ? aspectSentimentSummary.perAspect.find((a) => a.aspect === drilldown.aspect)?.[drilldown.polarity] ?? 0
    : 0;
  const drilldownExamples = drilldown
    ? commentExamplesScope[drilldown.aspect]?.[drilldown.polarity] ?? []
    : [];

  const aspectPositiveTotal = aspectSentimentSummary.perAspect.reduce((sum, a) => sum + a.positive, 0);
  const aspectNeutralTotal = aspectSentimentSummary.perAspect.reduce((sum, a) => sum + a.neutral, 0);
  const aspectNegativeTotal = aspectSentimentSummary.perAspect.reduce((sum, a) => sum + a.negative, 0);
  const aspectSentimentTotal = aspectPositiveTotal + aspectNeutralTotal + aspectNegativeTotal;
  const aspectPositivePct = aspectSentimentTotal ? (aspectPositiveTotal / aspectSentimentTotal) * 100 : 0;
  const aspectNeutralPct = aspectSentimentTotal ? (aspectNeutralTotal / aspectSentimentTotal) * 100 : 0;
  const aspectNegativePct = aspectSentimentTotal ? (aspectNegativeTotal / aspectSentimentTotal) * 100 : 0;

  const sortedAspectSentiment = useMemo(() => {
    const visibleFields = (Object.keys(ASPECT_LEGEND_FIELD) as (keyof typeof ASPECT_LEGEND_FIELD)[])
      .filter((key) => aspectLegendSelected[key])
      .map((key) => ASPECT_LEGEND_FIELD[key]);

    // With everything on/off, the stacked total is the same for every row order — keep the original order.
    if (visibleFields.length === 0 || visibleFields.length === 3) {
      return aspectSentimentSummary.perAspect;
    }

    return [...aspectSentimentSummary.perAspect].sort((a, b) => {
      const sumA = visibleFields.reduce((sum, field) => sum + a[field], 0);
      const sumB = visibleFields.reduce((sum, field) => sum + b[field], 0);
      return sumB - sumA;
    });
  }, [aspectLegendSelected, aspectSentimentSummary]);

  // Starts false so the "Mention per Produk" bars render at 0% width, then flips true
  // on the next frame so the CSS width transition animates them growing in on mount.
  const [productBarsAnimated, setProductBarsAnimated] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setProductBarsAnimated(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const { data: stats, isLoading: statsLoading } = useQuery<SentimentStats>({
    queryKey: ["sentiment-stats", days, selectedProduct],
    queryFn: () => sentimentApi.dashboard.stats(days, selectedProduct),
  });

  const hasData = stats && stats.total_comments > 0;

  // Same product-name-keyed lookup pattern as the ABSA snapshot above: driven by the page-level
  // product selector, with no fallback to "All Products" when the selected lineup has no
  // breakdown (Xpander / Xpander Cross never appear as a post's own lineup in this export).
  const productMentions: ProductMention[] = selectedProductName
    ? (PRODUCT_MENTIONS_BY_SOURCE[selectedProductName] ?? [])
    : PRODUCT_MENTIONS_BY_SOURCE["All Products"];
  const totalProductMentions = productMentions.reduce((sum, p) => sum + p.total, 0) || 1;

  // Outlines the bar segment matching the current drilldown selection so it's clear which
  // aspect+polarity the comment examples below belong to.
  const buildAspectBarSeriesData = (field: "positive" | "neutral" | "negative", color: string) =>
    sortedAspectSentiment.map((a) => ({
      value: a[field],
      itemStyle:
        drilldown && drilldown.aspect === a.aspect && drilldown.polarity === field
          ? { color, borderColor: chart.text, borderWidth: 2 }
          : { color },
    }));

  const aspectSentimentOption = {
    tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
    legend: {
      data: ["Positif", "Netral", "Negatif"],
      selected: aspectLegendSelected,
      bottom: 0,
      textStyle: { color: chart.text },
    },
    grid: { top: 10, right: 30, bottom: 40, left: 130 },
    xAxis: {
      type: "value" as const,
      axisLabel: { fontSize: 11, color: chart.textMuted },
      splitLine: { lineStyle: { color: chart.splitLine } },
    },
    yAxis: {
      type: "category" as const,
      inverse: true,
      data: sortedAspectSentiment.map((a) => a.aspect),
      axisLabel: { fontSize: 11, color: chart.textMuted },
      axisLine: { lineStyle: { color: chart.axisLine } },
    },
    animationEasing: "cubicOut" as const,
    animationDuration: 800,
    animationDelay: (idx: number) => idx * 80,
    series: [
      {
        name: "Positif", type: "bar" as const, stack: "total", cursor: "pointer",
        itemStyle: { color: "#10B981" },
        data: buildAspectBarSeriesData("positive", "#10B981"),
      },
      {
        name: "Netral", type: "bar" as const, stack: "total", cursor: "pointer",
        itemStyle: { color: "#9CA3AF" },
        data: buildAspectBarSeriesData("neutral", "#9CA3AF"),
      },
      {
        name: "Negatif", type: "bar" as const, stack: "total", cursor: "pointer",
        itemStyle: { color: "#EF4444" },
        data: buildAspectBarSeriesData("negative", "#EF4444"),
      },
    ],
  };

  const handleAspectBarClick = (params: { seriesName?: string; name?: string }) => {
    const polarity = params.seriesName ? ASPECT_LEGEND_FIELD[params.seriesName as keyof typeof ASPECT_LEGEND_FIELD] : undefined;
    if (!polarity || !params.name) return;
    setDrilldown((prev) =>
      prev && prev.aspect === params.name && prev.polarity === polarity ? null : { aspect: params.name!, polarity }
    );
  };

  if (statsLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-surface-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-100 rounded-[20px] animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-surface-100 rounded-[20px] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Period Selector — always visible so an empty period can be reset */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Sentiment Analysis Overview{stats?.period_label ? ` - ${stats.period_label}` : ""}
        </p>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3.5 py-2 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
        >
          <option value={0}>All data</option>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary (ABSA) — a hardcoded snapshot, not DB-backed, so it renders regardless of
          whether the selected product/period has live comments in `stats`. */}
      <Section label="Summary">
        {selectedProductName && !hasProductAbsa ? (
          <div className="text-center py-12 border border-surface-200 rounded-[20px]">
            <BarChart3 className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-text-tertiary">
              Belum ada snapshot ABSA untuk {selectedProductName}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <StatStrip
              items={[
                { label: "Total komentar", value: aspectSentimentSummary.totalComments.toLocaleString() },
                { label: "Aspek terdeteksi", value: aspectSentimentSummary.aspectsDetected.toLocaleString() },
                {
                  label: "Perlu review manual",
                  value: aspectSentimentSummary.needsManualReview.toLocaleString(),
                  valueClassName: aspectSentimentSummary.needsManualReview > 0 ? "text-status-warning" : undefined,
                },
                {
                  heading: "Positive",
                  dotClassName: "bg-status-success",
                  label: `${aspectPositiveTotal.toLocaleString()} comments`,
                  value: `${aspectPositivePct.toFixed(1)}%`,
                  valueClassName: "text-status-success",
                },
                {
                  heading: "Neutral",
                  dotClassName: "bg-blue-500",
                  label: `${aspectNeutralTotal.toLocaleString()} comments`,
                  value: `${aspectNeutralPct.toFixed(1)}%`,
                  valueClassName: "text-blue-500",
                },
                {
                  heading: "Negative",
                  dotClassName: "bg-status-error",
                  label: `${aspectNegativeTotal.toLocaleString()} comments`,
                  value: `${aspectNegativePct.toFixed(1)}%`,
                  valueClassName: "text-status-error",
                }
              ]}
            />
            <Card>
              <h4 className="text-sm font-semibold text-text-primary mb-1">Sentimen per aspek</h4>
              <p className="text-xs text-text-tertiary mb-4">
                Klik salah satu segmen warna untuk melihat komentar yang mendasarinya
              </p>
              <ReactECharts
                option={aspectSentimentOption}
                style={{ height: 340 }}
                onEvents={{
                  legendselectchanged: (params: { selected: Record<string, boolean> }) =>
                    setAspectLegendSelected(params.selected),
                  click: handleAspectBarClick,
                }}
              />
            </Card>
          </div>
        )}
      </Section>

      {/* Tren & Distribusi — both the drilldown panel and Mention per Produk are hardcoded/derived
          ABSA snapshots (same as Summary above), so they render regardless of `hasData`/`stats`. */}
      {(!!stats || productMentions.length > 0 || !!selectedProductName) && (
        <Section label="Tren & Distribusi">
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <Card className="lg:col-span-2 bg-surface-100">
                {drilldown ? (
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <SentimentBadge sentiment={drilldown.polarity} />
                        <h4 className="text-sm font-semibold text-text-primary truncate">{drilldown.aspect}</h4>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-text-tertiary whitespace-nowrap">{drilldownCount.toLocaleString()} komentar</span>
                        <button
                          onClick={() => setDrilldown(null)}
                          className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-200 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-text-tertiary mb-4">
                      Contoh komentar mentah yang mendasari klasifikasi ini (sample, bukan seluruh {drilldownCount.toLocaleString()} komentar)
                    </p>
                    {drilldownExamples.length > 0 ? (
                      <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                        {drilldownExamples.map((c, i) => (
                          <div key={i} className="rounded-xl border border-surface-200 bg-surface-white p-3">
                            <p className="text-sm text-text-primary whitespace-pre-wrap mb-2">{c.text}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-text-tertiary">Confidence: {c.conf}%</span>
                              {c.conf < 70 && (
                                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-status-warning/15 text-status-warning">
                                  Perlu review manual
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-text-tertiary py-4 text-center">
                        Belum ada contoh komentar untuk kombinasi ini di data snapshot.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-center min-h-[240px]">
                    <div>
                      <h4 className="text-sm font-semibold text-text-secondary mb-1">Belum ada aspek dipilih</h4>
                      <p className="text-xs text-text-tertiary max-w-xs mx-auto">
                        Klik salah satu segmen warna di chart "Sentimen per aspek" di atas untuk melihat komentar pendukungnya di sini.
                      </p>
                    </div>
                  </div>
                )}
              </Card>

              {(productMentions.length > 0 || !!selectedProductName) && (
                <Card className="w-full bg-surface-100 lg:col-span-3">
                  <h4 className="text-sm font-semibold text-text-primary">Mention per Produk</h4>
                  <p className="text-xs text-text-tertiary mb-4">
                    Disebut di komentar {selectedProductName || "produk lain"} (cross-mention)
                  </p>
                  {productMentions.length > 0 ? (
                    <div className="space-y-3">
                      {productMentions.map((p, i) => (
                        <div key={p.product_name} className="flex items-center gap-3 text-sm">
                          <span className="w-28 shrink-0 text-text-secondary truncate">{p.product_name}</span>
                          <div className="flex-1 h-2.5 rounded-full bg-surface-white overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand-accent transition-[width] duration-700 ease-out"
                              style={{
                                width: `${productBarsAnimated ? (p.total / totalProductMentions) * 100 : 0}%`,
                                transitionDelay: `${i * 60}ms`,
                              }}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-right text-text-tertiary text-xs">
                            {p.total.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-tertiary py-4 text-center">
                      Belum ada data cross-mention untuk {selectedProductName}.
                    </p>
                  )}
                </Card>
              )}
            </div>
          </div>
        </Section>
      )}

      {!hasData ? (
        <div className="text-center py-16">
          <BarChart3 className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-sm text-text-tertiary">
            {days === 0
              ? "No data available yet. Run a scrape to start collecting comments."
              : "Tidak ada komentar di periode ini. Coba pilih rentang lain atau \"All data\" di atas."}
          </p>
        </div>
      ) : (
      <>
      {/* Perlu Review */}
      {(needsReviewComments.length > 0 || dismissedReviewIds.size > 0) && (
        <Section label="Perlu Review" count={`${needsReviewComments.length} item`}>
          <Card>
          {needsReviewComments.length > 0 ? (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {needsReviewComments.map((c) => (
                <div
                  key={c.comment_id}
                  className="rounded-2xl border border-surface-200 p-4 space-y-2.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-blue-600">{c.aspect}</span>
                    </div>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full border border-status-warning text-status-warning shrink-0 ml-auto">
                      confidence {Math.round(c.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-sm text-text-primary">{c.content}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <span className={cn("inline-block px-3 py-1 text-xs font-semibold rounded-full border capitalize", POLARITY_OUTLINE_STYLES[c.polarity])}>
                        {c.polarity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      <button
                        onClick={() => dismissReviewItem(c.comment_id)}
                        title="Sentiment ini sudah benar"
                        className="p-1 rounded-md text-text-tertiary hover:text-status-success transition-colors"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openReviewCorrection(c)}
                        title="Sentiment ini salah"
                        className={cn(
                          "p-1 rounded-md transition-colors",
                          correctingReviewId === c.comment_id
                            ? "text-status-error"
                            : "text-text-tertiary hover:text-status-error"
                        )}
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
  
                  {correctingReviewId === c.comment_id && (
                    <div className="pt-2.5 mt-1 border-t border-surface-100 space-y-2.5">
                      <div>
                        <label className="text-[11px] font-medium text-text-tertiary block mb-1">Aspek yang benar</label>
                        <select
                          value={correctionAspect}
                          onChange={(e) => setCorrectionAspect(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-text-primary"
                        >
                          {(REVIEW_ASPECT_OPTIONS.includes(c.aspect) ? REVIEW_ASPECT_OPTIONS : [c.aspect, ...REVIEW_ASPECT_OPTIONS]).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-text-tertiary block mb-1">Polarity yang benar</label>
                        <div className="flex items-center gap-1.5">
                          {(["positive", "neutral", "negative"] as const).map((p) => (
                            <button
                              key={p}
                              onClick={() => setCorrectionPolarity(p)}
                              className={cn(
                                "px-2.5 py-1 text-xs font-semibold rounded-full border capitalize transition-colors",
                                correctionPolarity === p
                                  ? POLARITY_OUTLINE_STYLES[p]
                                  : "border-surface-200 text-text-tertiary hover:bg-surface-100"
                              )}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          onClick={submitReviewCorrection}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors"
                        >
                          Simpan koreksi
                        </button>
                        <button
                          onClick={() => setCorrectingReviewId(null)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg text-text-secondary hover:bg-surface-100 transition-colors"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary py-4 text-center">
              {dismissedReviewIds.size > 0
                ? "Semua komentar sudah direview."
                : selectedProductName
                  ? `Tidak ada komentar yang perlu direview untuk ${selectedProductName}.`
                  : "Tidak ada komentar yang perlu direview."}
            </p>
          )}
          </Card>
        </Section>
      )}
      </>
      )}
    </div>
  );
}
