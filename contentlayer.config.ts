import { defineDocumentType, makeSource } from "contentlayer2/source-files"
import { readingTime } from "reading-time-estimator"

export const Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: `**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      description: "The title of the post",
      required: true,
    },
    description: {
      type: "string",
      description: "The description of the post",
      required: true,
    },
    date: {
      type: "date",
      description: "The date of the post",
      required: true,
    },
    locale: {
      type: "enum",
      options: ["es", "en"],
      description: "The locale of the post",
      required: true,
    },
    slug: {
      type: "string",
      description: "The slug of the post",
      required: true,
    },
    cover: {
      type: "string",
      description: "The cover image of the post",
      required: false,
    },
    tags: {
      type: "list",
      of: { type: "string" },
      description: "Tags for the post",
      required: false,
    },
    author: {
      type: "string",
      description: "The author of the post",
      required: false,
      default: "Alberto Carrasco",
    },
    published: {
      type: "boolean",
      description: "Whether the post is published",
      required: false,
      default: true,
    },
  },
  computedFields: {
    url: {
      type: "string",
      resolve: (post) => `/${post.locale}/blog/${post.slug}`,
    },
    readingTime: {
      type: "json",
      resolve: (post) => readingTime(post.body.raw, 200, "es"),
    },
    wordCount: {
      type: "number",
      resolve: (post) => post.body.raw.split(/\s+/).length,
    },
  },
}))

export default makeSource({
  contentDirPath: "./content",
  documentTypes: [Post],
  mdx: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
})
