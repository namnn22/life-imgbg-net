import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { GraphQLClient, gql } from 'graphql-request';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
	const endpoint = process.env.GRAPHQL_ENDPOINT as string;
	const graphQLClient = new GraphQLClient(endpoint);
	const referringURL = ctx.req.headers?.referer || null;
	const pathArr = ctx.query.postpath as Array<string>;
	const path = pathArr.join('/');
	console.log(path);
	const fbclid = ctx.query.fbclid;

	// redirect if Facebook is the referer or request contains fbclid
	if (referringURL?.includes('facebook.com') || fbclid) {
		return {
			redirect: {
				permanent: false,
				destination: `${
					endpoint.replace(/(\/graphql\/)/, '/') + encodeURI(path as string)
				}`,
			},
		};
	}

	// Updated GraphQL query using nodeByUri
	const query = gql`
		{
			nodeByUri(uri: "/${path}/") {
				__typename
				... on Post {
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
				... on Page {
					id
					title
					content
				}
			}
		}
	`;

	const data = await graphQLClient.request(query);

	// Check if the node was found
	if (!data.nodeByUri) {
		return {
			notFound: true,
		};
	}

	// Pass the node data as props
	return {
		props: {
			path,
			node: data.nodeByUri,
			host: ctx.req.headers.host,
		},
	};
};

interface PostProps {
	node: any;
	host: string;
	path: string;
}

const Post: React.FC<PostProps> = (props) => {
	const { node, host, path } = props;
	console.log(node);

	// to remove tags from excerpt
	const removeTags = (str: string) => {
		if (str === null || str === '') return '';
		else str = str.toString();
		return str.replace(/(<([^>]+)>)/gi, '').replace(/\[[^\]]*\]/, '');
	};

	return (
		<>
			<Head>
				<meta property="og:title" content={node.title} />
				<link rel="canonical" href={`https://${host}/${path}`} />
				<meta property="og:description" content={removeTags(node.excerpt || '')} />
				<meta property="og:url" content={`https://${host}/${path}`} />
				<meta property="og:type" content="article" />
				<meta property="og:locale" content="en_US" />
				<meta property="og:site_name" content={host.split('.')[0]} />
				{node.dateGmt && (
					<meta property="article:published_time" content={node.dateGmt} />
				)}
				{node.modifiedGmt && (
					<meta property="article:modified_time" content={node.modifiedGmt} />
				)}
				{node.featuredImage && (
					<meta property="og:image" content={node.featuredImage.node.sourceUrl} />
				)}
				{node.featuredImage && (
					<meta
						property="og:image:alt"
						content={node.featuredImage.node.altText || node.title}
					/>
				)}
				<meta http-equiv="refresh" content={`0.5; url=https://life.imgbg.net/${path}`} />
				<title>{node.title}</title>
			</Head>
			<div className="post-container">
				<h1>{node.title}</h1>
				<input type="hidden" value={node.featuredImage}></input>
				{node.featuredImage && (
					<img
						src={node.featuredImage.node.sourceUrl}
						alt={node.featuredImage.node.altText || node.title}
					/>
				)}
				<article dangerouslySetInnerHTML={{ __html: node.content }} />
			</div>
		</>
	);
};

export default Post;
