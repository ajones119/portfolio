import fs from "node:fs";

const ComputerBooks = fetch("https://openlibrary.org/search.json?q=%22tolkein%22&a").then(response => {
    console.log("response", response);
    return response.json().then(data => {
        return data.docs.map((book: any) => {
            return {
                title: book?.title || "Unknown",
                subtitle: book?.subtitle || "",
                author: book?.author_name?.[0] || "Unknown",
                year: book?.first_publish_year || "0"
            }
        })
    })
});

ComputerBooks.then(data => {
    fs.writeFileSync("src/data/ComputerBooks.json", JSON.stringify(data, null, 2));
    console.log(`Successfully fetched and saved ${data.length} books to src/data/ComputerBooks.json`);
}).catch(error => {
    console.error("Error fetching books:", error);
    process.exit(1);
});

