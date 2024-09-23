import React from 'react';
import Head from 'next/head'; // Ensure Head is correctly imported
import { GetServerSideProps } from 'next';
import { GraphQLClient, gql } from 'graphql-request';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const endpoint = process.env.GRAPHQL_ENDPOINT;

  if (!endpoint) {
    return {
      notFound: true,
    };
  }

  const graphQLClient = new GraphQLClient(endpoint);
  
  // Extracting path from the URL
  const pathArr = ctx.query.postpath as string[];
  const path = pathArr.join('/');

  // User agent for Facebook bot detection
  const userAgent = ctx.req.headers['user-agent'] || '';
  const isFacebookCrawler = /facebookexternalhit|facebot/i.test(userAgent);

  // Check if Facebook is crawling the page
  if (isFacebookCrawler) {
    // If it's Facebook, return metadata for OG scraping without a redirect
    const query = gql`
      query GetPost($path: String!) {
        post(id: $path, idType: URI) {
          id
          excerpt
          title
          link
          dateGmt
          modifiedGmt
          content
          author {
            node {
              name
            }
          }
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
        }
      }
    `;

    try {
      const data = await graphQLClient.request(query, { path: `/${path}/` });

      if (!data?.post) {
        return { notFound: true };
      }

      return {
        props: {
          post: data.post,
          path,
        },
      };
    } catch (error) {
      return {
        notFound: true,
      };
    }
  } else {
    // For regular users, redirect immediately
    return {
      redirect: {
        destination: `https://healthbuzzonline.com/${path}`,
        permanent: false, // Use true for a 301 redirect
      },
    };
  }
};

interface PostProps {
  post: {
    title: string;
    excerpt: string;
    content: string;
    featuredImage?: {
      node: {
        sourceUrl: string;
        altText: string;
      };
    };
  };
  path: string;
}

const Post: React.FC<PostProps> = ({ post }) => {
  // This only renders for Facebook crawlers, not regular users
  return (
    <>
      <Head>
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:url" content={`https://your-original-domain.com/${post.content}`} />
        <meta property="og:image" content={post.featuredImage?.node?.sourceUrl} />
        <meta property="og:image:alt" content={post.featuredImage?.node?.altText || post.title} />
        <title>{post.title}</title>
      </Head>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </>
  );
};

export default Post;
