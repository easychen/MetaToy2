import { fileURLToPath } from 'url'
import fs from 'fs'
import path, { dirname, join } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
import ejs from 'ejs';
import Helper from './helper.mjs';
const helper = new Helper();
const project_dir = path.join(__dirname, '..');


export function engine( tpl_file, data={}, options = {} ) {
    // 首先分析模板文件的头部，提取模板参数，最重要的参数是模板的目标地址（相对项目根目录）
    const source = fs.readFileSync( tpl_file, 'utf-8' );
    const {params, cleaned} = getHeadParams( source );
    const ejs_data = {OPT:options,DATA:data,H:helper};
    const target_file = path.join( project_dir, ejs.render(params.to,ejs_data) );
    if( !fs.existsSync(target_file) )
    {
        // 如果目标文件不存在，创建它
        fs.writeFileSync( target_file, ejs.render(cleaned, ejs_data) );
    }
    else
    {
        // 如果文件存在
        if( params.replace?.trim() == 'overwrite' )
        {
            console.log("🚜 文件已经存在，overwrite");
            fs.writeFileSync( target_file, ejs.render(cleaned, ejs_data) );
        }
        else
        {
            console.log("🚜 文件已存在，进入Update模式");
            // 从 模版文件中把 /* @MT-TPL-.+?-START */ 部分区块全部提取出来，运算后替换到目标文件中
            let blocks = getBlockToReplace( source ); 
            const old_code = fs.readFileSync( target_file, 'utf-8' );
            let replaced_content = old_code;
            for( let block of blocks )
            {
                console.log( "来自模板的block", block );
                
                // 首先生成区块对应的代码
                block['output'] = ejs.render(removeBlockParams(block['content']), ejs_data);

                // 分析参数  
                const regex = new RegExp('\\/\\*\\s*(@' + block.name.replace('-','\\-') + '\\-)START\\s*\\*\\/(.+?)\\/\\*\\s*(\\1END)\\s*\\*\\/', 'gs');
                const params = getParams( block.content, true );
                console.log("获得区块级别的参数", params);
                // 获得从 old_code 中匹配的内容
                // 去掉g参数，使其返回捕获组
                const regex2 = new RegExp('\\/\\*\\s*(@' + block.name.replace('-','\\-') + '\\-)START\\s*\\*\\/(.+?)\\/\\*\\s*(\\1END)\\s*\\*\\/', 's');
                let old_block = old_code.match(regex2)?.[2] || '';
                console.log("获得旧代码中的区块", old_block);

                let do_append = false;
                // 判断是否进入append模式
                if( params.replace == 'append' )
                {
                    console.log("append模式" , params.replace, params.skipif);
                    do_append = true;
                    if( params.skipif )
                    {
                        const condition = ejs.render(params.skipif, ejs_data).trim();
                        // console.log("开始监测关键字", old_block+'====='+ condition+'=====');
                        // 检查字符串 old_block中是否含有字符串 condition
                        if( old_block && old_block.includes(condition) )
                        {
                            console.log("检查到包含，不追加");
                            do_append = false;
                        }
                        else
                        {
                            console.log("检查到不包含，追加");
                            do_append = true;
                        }

                        // const regex3 = new RegExp(condition, 's');
                        // if( old_block.match(regex3) )
                        // {
                        //     do_append = false;
                        // }
                    }
                    // SkipRegex 匹配到正则则跳过
                    if( params.skipregex )
                    {
                        const regex = ejs.render(params.skipregex, ejs_data).trim();
                        if( old_block.match(new RegExp(regex)) )
                        {
                            console.log("检查到包含，不追加");
                            do_append = false;
                        }
                        else
                        {
                            console.log("检查到不包含，追加");
                            do_append = true;
                        }
                    }
                }

                // 对 new_block 进行加工备用
                let new_block = removeBlockParams(block.output).trim();
                
                let center_block = '';   
                if( do_append )
                {
                    // 追加模式
                    // 由于在react中，多个child不能直接出现，所以这里需要特殊处理（用<></>包裹）
                    if(  params.wrap == 'react')
                    {
                        // 将原有的内容去掉<></>，然后trim，然后追加到新内容后面
                        old_block = old_block.replace(/<>(.+?)<\/>\s*/gs, '$1');
                        // 这里还要考虑到区块参数多行时的情况
                        old_block = removeBlockParams(old_block).trim();

                        center_block = `<>${new_block}\n${block.spaces}${old_block}</>`;
                    }else
                    {
                        // center_block = `${new_block}\n${block.spaces}${old_block}`;
                        
                        old_block = old_block.trim();
                        center_block = '';
                        if( old_block ) center_block = old_block;
                        if( new_block ) center_block = new_block + "\n" + block.spaces + center_block;
                    }
                    
                    
                }else
                {
                    // 虽然是追加模式，但是因为条件不满足，所以不追加
                    if( params.replace == 'append' )
                    {
                        center_block = old_block.trim();
                    }else
                    {
                        // 替换模式
                        center_block = new_block;
                    }
                    
                }
                center_block = removeBlockParams(center_block).trim();           
                // if(  params.wrap == 'react')
                // {
                //     if( do_append )
                //     {
                //         // 追加模式
                //         // 将原有的内容去掉<></>，然后trim，然后追加到新内容后面
                //         old_block = old_block.replace(/<>(.+?)<\/>\s*/gs, '$1')?.trim();
                //         center_block = `<>${new_block}\n${block.spaces}${old_block}</>`;
                //     }else
                //     {
                //         // 替换模式
                //         center_block = new_block;
                //     }
                    
                // }else
                // {
                //     if( do_append )
                //     {
                //         center_block = `${new_block.trim()}\n${block.spaces}${old_block.trim()}`;
                //     }else
                //     {
                //         center_block = old_block.trim();
                //     }   
                // }

                const target_content = center_block?.trim()?.length > 0 ? `/* @${block.name}-START */\n${block.spaces}${center_block}\n${block.spaces}/* @${block.name}-END */` : `/* @${block.name}-START */\n${block.spaces}/* @${block.name}-END */`;

                replaced_content = replaced_content.replace(regex, target_content);
                
            }
            // console.log( blocks );
            // console.log( "replaced_content", replaced_content );
            if( replaced_content != old_code )
            {
                console.log('🚜 生成了新版本的代码，覆盖原代码');
                fs.writeFileSync( target_file, replaced_content );
            }
            else
            {
                console.log('🚜 没有需要更新的内容，跳过');
            }
        }
    }
} 


function getHeadParams( source )
{
    // 头注释格式如下，注意头注释前不应有其他文内容
    /* MT-TPL-FILE
     * @Desc: 创建API的基本模板
     * @To: api/app/Http/Controllers/<%= Tab.name %>Controller.php 
     * @Replace: null
     */
    // 返回两个数据：参数和去掉头注释后的剩余文本
    const regex = /\/\s*\*\s+@MT\-TPL\-FILE\s*\n(.+?\n)\s*\*\/\n/gis;
    const block = source.match(regex)[0];
    const result = source.replace(regex, '');
    let params = {};
    if( block  )
    {
        // const regex = /\s*\*\s*@([A-Za-z0-9_\-]+)\s*:\s*(.*?)\n/gis;
        // const ret2 = [...block.matchAll(regex)];
        // for( let m of ret2 )
        // {
        //     m[2] = m[2].trim();
        //     if( m[2]  == 'null' || m[2] == '-' ) m[2] = null; 
        //     params[String(m[1]).toLowerCase()] = m[2]??null;
        // }
        params = getParams( block );
    }
    return { params, cleaned: result.trim() };
}

function getParams( source, block = false )
{
    let params = {};
    const regex = block ? /\s*\*\s*@([A-Za-z0-9_\-]+)\s*:\s*(.*?)\s*\*\/\n/gis : /\s*\*\s*@([A-Za-z0-9_\-]+)\s*:\s*(.*?)\n/gis;
    const ret2 = [...source.matchAll(regex)];
    for( let m of ret2 )
    {
        m[2] = m[2].trim();
        if( m[2]  == 'null' || m[2] == '-' ) m[2] = null; 
        params[String(m[1]).toLowerCase()] = m[2]??null;
    }
    return params;
}

function removeBlockParams(source)
{
    const regex = /\s*\/\s*\*\s*@([A-Za-z0-9_\-]+)\s*:\s*(.*?)\s*\*\/\n\s*/gis;
    return source.replace(regex, '');
}

function getBlockToReplace(source)
{
    // 更新块的格式
    /* @MT-TPL-LIST-START */
    // 这里是模版代码
    /* @MT-TPL-LIST-END */
    let blocks = [];
    const regex = /\/\*\s*(@(MT\-TPL-.+?)\-)START\s*\*\/(.+?)\/\*\s*\1END\s*\*\//gs;
    const ret = [...source.matchAll(regex)];
    for( let m of ret )
    {
        // console.log(m);
        if( m[3].trim().length > 0 )
        blocks.push( {name:m[2],content:m[3].trim(),spaces:m[3].substring(1,m[3].length-m[3].trimLeft().length)} );
    }

    return blocks;
}