import deepAssign from './mini-deep-assign.mjs';

export class Helper {
    
    // uc first 别名函数
    up1(string)
    {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    low1(string)
    {
        return string.charAt(0).toLowerCase() + string.slice(1);
    }

    // add space between camel case
    as(string)
    {
        return string.replace(/\B([A-Z])/g, ' $1');
    }

    low(string)
    {
        return string.toLocaleLowerCase();
    }

    up(string)
    {
        return string.toLocaleUpperCase();
    }

    // 驼峰转下划线 under_line
    ul(string)
    {
        return string.replace(/\B([A-Z])/g, '_$1').toLowerCase();
    }

    // 下划线转小驼峰 littleCamel
    lc(string)
    {
        return this.low1(string.replace(/_(\w)/g,  (all, letter) =>letter.toUpperCase()));
    }

    // 下划线转大驼峰 bigCamel
    bc(string)
    {
        return this.up1(this.lc(string));
    }

    fields( meta, table, scenario=null, array=true )
    {
        return this.section( meta, table, scenario, 'ALL', array );
    }

    section( meta, table, scenario=null, fields=null, array=false)
    {
        const debug_field = false;
        
        // 首先获取默认场景的全部数据
        let tables = meta.DB.tables;
        if( table ) table = this.ul(table);
        // console.log( table, tables );
        if( !tables[table] ) return false;
        
        // 首先取得默认场景配置
        const scenarios = tables[table].scenarios;
        let ret = tables[table].scenarios.default;

        // console.log("默认数据", ret['fields']['amount']);
        
        // 如果指定了特定场景，则合并特定场景的配置
        if( scenario )
        {
            // console.log("加载 scenario 数据", scenario);
            scenario = scenario.toLocaleLowerCase();
            if(scenarios[scenario])
            {
                if( debug_field )
                {
                    console.log("default的数据", ret['fields'][debug_field]);
                    console.log(scenario+"的数据", scenarios[scenario]['fields'][debug_field]);
                }
                
                ret = deepAssign(ret, scenarios[scenario], true);
            }
                
        }
        if( debug_field ) console.log("最终数据", ret['fields'][debug_field]);
        
        // 如果指定了字段
        if( fields )
        {
            if( fields == 'ALL' || !ret.fields[fields] )
            {
                ret = ret.fields;
            }
            else
            {
                ret = ret.fields[fields];
            }
        }
        // console.log("ret", ret);
        if( array && ret )
        {
            let ret_array = [];
            const keys = Object.keys(ret);
            for( let key of keys )
            {
                ret_array.push( {name:key,...ret[key]} );
            }
            ret =  ret_array;
        }

        // console.log("ret", ret);
        return ret;
    }
}

export default Helper;