'use client';
import {useState} from 'react';
import {optimizedImages} from '../optimized-images';
/** Decorative artwork keeps its alpha channel and has no network-dependent layout. */
export default function OptimizedDecorImage({src,className}:{src:string;className:string}){
 const [failed,setFailed]=useState(false);const image=optimizedImages[src];
 return <img className={className} src={src} srcSet={image?.smallWidth?`${src.replace('.webp','-small.webp')} ${image.smallWidth}w, ${src} ${image.width}w`:undefined} sizes={className.includes('cabinet')?'(max-width:700px) 170px, 450px':className.includes('award')?'80px':'(max-width:700px) 180px, 350px'} width={image?.width} height={image?.height} loading="lazy" decoding="async" alt="" aria-hidden="true" style={failed?{visibility:'hidden'}:undefined} onError={event=>{setFailed(true);event.currentTarget.parentElement?.setAttribute('data-artwork-fallback','true')}}/>;
}
