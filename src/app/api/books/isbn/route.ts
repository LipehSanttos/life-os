import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawIsbn = searchParams.get("isbn") || searchParams.get("query") || "";
    const cleanQuery = rawIsbn.trim().replace(/[-\s]/g, "");

    if (!cleanQuery) {
      return NextResponse.json({ error: "Informe o código ISBN ou título para busca." }, { status: 400 });
    }

    // 1. Try Google Books API
    try {
      const isDigits = /^\d{9}[\dXx]|\d{13}$/.test(cleanQuery);
      const searchUrl = isDigits
        ? `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanQuery}&maxResults=1`
        : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(cleanQuery)}&maxResults=1`;

      const gRes = await fetch(searchUrl, { next: { revalidate: 3600 } });
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData.items && gData.items.length > 0) {
          const info = gData.items[0].volumeInfo || {};
          let cover = info.imageLinks?.extraLarge || info.imageLinks?.large || info.imageLinks?.medium || info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
          if (cover && cover.startsWith("http://")) {
            cover = cover.replace("http://", "https://");
          }

          // Extract ISBN
          let foundIsbn = cleanQuery;
          if (info.industryIdentifiers) {
            const isbn13 = info.industryIdentifiers.find((i: any) => i.type === "ISBN_13");
            const isbn10 = info.industryIdentifiers.find((i: any) => i.type === "ISBN_10");
            foundIsbn = isbn13?.identifier || isbn10?.identifier || cleanQuery;
          }

          return NextResponse.json({
            found: true,
            title: info.title || "Sem título",
            author: info.authors ? info.authors.join(", ") : "Autor não informado",
            totalPages: info.pageCount || 200,
            isbn: foundIsbn,
            coverUrl: cover || `https://covers.openlibrary.org/b/isbn/${foundIsbn}-L.jpg?default=false`,
            description: info.description || null,
            publishedDate: info.publishedDate || null,
            publisher: info.publisher || null,
          });
        }
      }
    } catch (gErr) {
      console.warn("Google Books API lookup failed, trying Open Library:", gErr);
    }

    // 2. Fallback: Open Library API
    try {
      const olUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanQuery}&format=json&jscmd=data`;
      const olRes = await fetch(olUrl);
      if (olRes.ok) {
        const olData = await olRes.json();
        const bookKey = `ISBN:${cleanQuery}`;
        if (olData[bookKey]) {
          const b = olData[bookKey];
          const cover = b.cover?.large || b.cover?.medium || b.cover?.small;
          return NextResponse.json({
            found: true,
            title: b.title || "Sem título",
            author: b.authors ? b.authors.map((a: any) => a.name).join(", ") : "Autor não informado",
            totalPages: b.number_of_pages || 200,
            isbn: cleanQuery,
            coverUrl: cover || `https://covers.openlibrary.org/b/isbn/${cleanQuery}-L.jpg`,
            description: typeof b.notes === "string" ? b.notes : null,
            publishedDate: b.publish_date || null,
            publisher: b.publishers ? b.publishers.map((p: any) => p.name).join(", ") : null,
          });
        }
      }
    } catch (olErr) {
      console.warn("Open Library lookup failed:", olErr);
    }

    return NextResponse.json(
      {
        found: false,
        message: "Nenhum livro localizado para este ISBN. Você pode preencher os dados manualmente.",
      },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro na busca por ISBN." }, { status: 500 });
  }
}
