// Starter template for adding a new written course module.
export const course = {
  meta: {
    id: "my-course-id",
    title: "My Course",
    subtitle: "Short description",
    version: "v1",
  },
  glossaryId: "my-course-id",
  lessons: [
    {
      id: "intro",
      module: "0. Welcome",
      title: "Introduction",
      tags: ["fundamentals"],
      content: `<p>Your lesson HTML here.</p>`,
      quiz: [],
    },
  ],
};
